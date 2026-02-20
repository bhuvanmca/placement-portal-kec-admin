package utils

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// GetS3Client creates an S3-compatible client for Garage
func GetS3Client() (*s3.Client, error) {
	useSSL := os.Getenv("GARAGE_USE_SSL") == "true"

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			os.Getenv("GARAGE_ACCESS_KEY"),
			os.Getenv("GARAGE_SECRET_KEY"),
			"",
		)),
		config.WithRegion(os.Getenv("GARAGE_REGION")),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		endpoint := os.Getenv("GARAGE_ENDPOINT")
		if useSSL {
			o.BaseEndpoint = aws.String("https://" + endpoint)
		} else {
			o.BaseEndpoint = aws.String("http://" + endpoint)
		}
		o.UsePathStyle = true
	}), nil
}

// GetChatBucket returns the chat-specific bucket name
func GetChatBucket() string {
	bucket := os.Getenv("GARAGE_CHAT_BUCKET")
	if bucket == "" {
		return os.Getenv("GARAGE_BUCKET") // fallback
	}
	return bucket
}

// DeleteS3Object deletes an object from the given bucket by key
func DeleteS3Object(ctx context.Context, bucket, key string) error {
	client, err := GetS3Client()
	if err != nil {
		return fmt.Errorf("failed to create S3 client: %w", err)
	}

	_, err = client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete S3 object: %w", err)
	}

	return nil
}

// ExtractS3KeyFromURL extracts the S3 object key from a Garage/S3 URL.
// URLs typically look like: http://host:port/bucket/key or a presigned version.
func ExtractS3KeyFromURL(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}

	// Path is like /bucket-name/path/to/file.ext
	path := strings.TrimPrefix(parsed.Path, "/")

	// Remove the bucket prefix
	bucket := GetChatBucket()
	if strings.HasPrefix(path, bucket+"/") {
		return strings.TrimPrefix(path, bucket+"/"), nil
	}

	// Fallback: try default bucket
	defaultBucket := os.Getenv("GARAGE_BUCKET")
	if strings.HasPrefix(path, defaultBucket+"/") {
		return strings.TrimPrefix(path, defaultBucket+"/"), nil
	}

	// If bucket is not in path, the entire path is the key
	return path, nil
}

// GetPresignedURL generates a time-limited signed URL for an object
func GetPresignedURL(bucket, key string, expirationMinutes int) (string, error) {
	client, err := GetS3Client()
	if err != nil {
		return "", err
	}

	presignClient := s3.NewPresignClient(client)

	result, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(time.Duration(expirationMinutes)*time.Minute))

	if err != nil {
		return "", fmt.Errorf("failed to sign URL: %w", err)
	}

	return result.URL, nil
}

// GenerateSignedProfileURL takes a stored DB URL, cleans it, and returns a Presigned URL
func GenerateSignedProfileURL(originalURL string) string {
	if originalURL == "" {
		return ""
	}

	publicURL := os.Getenv("GARAGE_PUBLIC_URL")
	endpoint := os.Getenv("GARAGE_ENDPOINT")

	// If it's already a full URL not pointing to our Garage, return as is
	if !strings.Contains(originalURL, publicURL) && !strings.Contains(originalURL, endpoint) {
		if strings.HasPrefix(originalURL, "http://") || strings.HasPrefix(originalURL, "https://") {
			return originalURL
		}
	}

	bucket, key := ExtractBucketAndKey(originalURL)
	if bucket == "" || key == "" {
		return originalURL
	}

	// Clean query params from key
	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	// Generate for 60 minutes
	signedURL, err := GetPresignedURL(bucket, key, 60)
	if err != nil {
		fmt.Printf("Error signing profile URL: %v\n", err)
		return originalURL
	}
	return signedURL
}

// ExtractBucketAndKey parses bucket and key from a Garage URL
func ExtractBucketAndKey(rawURL string) (string, string) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", ""
	}

	path := strings.TrimPrefix(parsed.Path, "/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) < 2 {
		return "", ""
	}

	return parts[0], parts[1]
}
