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

// GetBrowserAccessibleURL constructs a URL accessible from the browser
// by routing through Caddy's /storage/* reverse proxy to Garage.
func GetBrowserAccessibleURL(bucketName, objectKey string) (string, error) {
	if bucketName == "" {
		bucketName = os.Getenv("GARAGE_BUCKET")
	}
	if bucketName == "" {
		return "", fmt.Errorf("GARAGE_BUCKET env var is not set")
	}
	if objectKey == "" {
		return "", fmt.Errorf("object key is empty")
	}

	publicDomain := os.Getenv("PUBLIC_DOMAIN")
	if publicDomain == "" {
		return "", fmt.Errorf("PUBLIC_DOMAIN env var is not set")
	}
	if publicDomain[len(publicDomain)-1] == '/' {
		publicDomain = publicDomain[:len(publicDomain)-1]
	}

	return fmt.Sprintf("%s/storage/%s/%s", publicDomain, bucketName, objectKey), nil
}

// GenerateSignedProfileURL takes a stored DB URL and returns a browser-accessible URL
func GenerateSignedProfileURL(originalURL string) string {
	if originalURL == "" {
		return ""
	}

	bucket, key := ExtractBucketAndKey(originalURL)
	if bucket == "" || key == "" {
		return originalURL
	}

	// Clean query params from key
	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	publicURL, err := GetBrowserAccessibleURL(bucket, key)
	if err != nil {
		fmt.Printf("Error generating profile URL: %v\n", err)
		return originalURL
	}
	return publicURL
}

// ExtractBucketAndKey parses bucket and key from a Garage URL
func ExtractBucketAndKey(rawURL string) (string, string) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", ""
	}

	path := strings.TrimPrefix(parsed.Path, "/")
	// Handle legacy /storage/ prefix format
	path = strings.TrimPrefix(path, "storage/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) < 2 {
		return "", ""
	}

	return parts[0], parts[1]
}
