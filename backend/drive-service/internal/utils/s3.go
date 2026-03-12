package utils

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"net/http" // [NEW]
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// getS3Client creates an S3-compatible client (Garage)
func getS3Client() (*s3.Client, error) {
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
		return nil, err
	}

	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(func() string {
			endpoint := os.Getenv("GARAGE_ENDPOINT")
			if useSSL {
				return "https://" + endpoint
			}
			return "http://" + endpoint
		}())
		o.UsePathStyle = true
	}), nil
}

// GetS3Client returns a configured S3 client (public wrapper for garage admin)
func GetS3Client() *s3.Client {
	client, err := getS3Client()
	if err != nil {
		panic(fmt.Sprintf("Failed to create S3 client: %v", err))
	}
	return client
}

// GetBucketName returns the configured bucket name
func GetBucketName() string {
	return os.Getenv("GARAGE_BUCKET")
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

// GetChatBucketName returns the chat-specific bucket name
func GetChatBucketName() string {
	bucket := os.Getenv("GARAGE_CHAT_BUCKET")
	if bucket == "" {
		return os.Getenv("GARAGE_BUCKET") // fallback
	}
	return bucket
}

// InitBucket ensures the configured bucket exists and has a public read policy
func InitBucket() error {
	client, err := getS3Client()
	if err != nil {
		return fmt.Errorf("failed to create s3 client: %w", err)
	}

	bucketName := os.Getenv("GARAGE_BUCKET")
	if bucketName == "" {
		return fmt.Errorf("GARAGE_BUCKET env var is not set")
	}

	// Check if bucket exists
	_, err = client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})

	if err != nil {
		// If bucket not found, create it
		fmt.Printf("Bucket %s not found, creating...\n", bucketName)
		_, err = client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
			Bucket: aws.String(bucketName),
		})
		if err != nil {
			fmt.Printf("Warning: Failed to create bucket %s (might exist): %v\n", bucketName, err)
			// return fmt.Errorf("failed to create bucket: %w", err)
		}
	}

	// Always enforce public read policy
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}
		]
	}`, bucketName)

	_, err = client.PutBucketPolicy(context.TODO(), &s3.PutBucketPolicyInput{
		Bucket: aws.String(bucketName),
		Policy: aws.String(policy),
	})
	if err != nil {
		return fmt.Errorf("failed to set bucket policy: %w", err)
	}

	fmt.Printf("Bucket %s initialized with public read policy\n", bucketName)
	return nil
}

// GetPublicURL generates a public URL for accessing uploaded files through Caddy proxy.
func GetPublicURL(bucket, path string) string {
	return getPublicURL(bucket, path)
}

// getPublicURL generates a browser-accessible URL for uploaded files.
// Uses PUBLIC_DOMAIN to construct a URL routed through Caddy's /storage/* proxy.
// Falls back to GARAGE_PUBLIC_URL if PUBLIC_DOMAIN is not set.
func getPublicURL(bucket, path string) string {
	// Ensure no leading slash in path
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	// Prefer browser-accessible URL via Caddy proxy
	if url, err := GetBrowserAccessibleURL(bucket, path); err == nil {
		return url
	}
	// Fallback to raw GARAGE_PUBLIC_URL
	publicURL := os.Getenv("GARAGE_PUBLIC_URL")
	if len(publicURL) > 0 && publicURL[len(publicURL)-1] == '/' {
		publicURL = publicURL[:len(publicURL)-1]
	}
	return fmt.Sprintf("%s/%s/%s", publicURL, bucket, path)
}

// UploadToS3 uploads a file to S3-compatible storage and returns the Public URL
// Used in handlers: utils.UploadToS3(file, fileHeader, "resumes/24MCR029_resume.pdf")
// Compatible with Garage object storage
func UploadToS3(file multipart.File, fileHeader *multipart.FileHeader, path string) (string, error) {
	client, err := getS3Client()
	if err != nil {
		return "", err
	}

	// Read file into buffer
	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	bucketName := os.Getenv("GARAGE_BUCKET")

	// Ensure Bucket Exists (Garage/Local)
	_, err = client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		// If bucket not found, create it
		fmt.Printf("Bucket %s not found, creating...\n", bucketName)
		_, err = client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
			Bucket: aws.String(bucketName),
		})
		if err != nil {
			fmt.Printf("Warning: Failed to create bucket %s (might exist): %v\n", bucketName, err)
			// return "", fmt.Errorf("failed to create bucket: %w", err)
		}

		// Set Bucket Policy to Public (Read Only)
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {"AWS": ["*"]},
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
				}
			]
		}`, bucketName)

		_, err = client.PutBucketPolicy(context.TODO(), &s3.PutBucketPolicyInput{
			Bucket: aws.String(bucketName),
			Policy: aws.String(policy),
		})
		if err != nil {
			fmt.Printf("Warning: Failed to set bucket policy: %v\n", err)
		}
	}

	// Detect Content-Type
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(buf.Bytes())
	}

	// Upload
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:             aws.String(bucketName),
		Key:                aws.String(path), // e.g. "24MCR029/resume.pdf"
		Body:               bytes.NewReader(buf.Bytes()),
		ContentType:        aws.String(contentType),
		ContentDisposition: aws.String("inline"),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3 storage: %w", err)
	}

	// Generate Public URL using standard S3 pattern
	publicURL := getPublicURL(bucketName, path)

	return publicURL, nil
}

// DeleteFromS3 removes a file from S3-compatible storage
// Used in handlers or cleanup logic
func DeleteFromS3(path string) error {
	client, err := getS3Client()
	if err != nil {
		return err
	}

	_, err = client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(os.Getenv("GARAGE_BUCKET")),
		Key:    aws.String(path),
	})

	if err != nil {
		return fmt.Errorf("failed to delete from S3 storage: %w", err)
	}
	return nil
}

// ExtractPathFromURL extracts the object key from a storage URL
// Supports both new Garage/S3 format (http://host:port/bucket/path) and legacy format
func ExtractPathFromURL(fileURL string) string {
	if fileURL == "" {
		return ""
	}

	u, err := url.Parse(fileURL)
	if err != nil {
		fmt.Printf("Error parsing URL %s: %v\n", fileURL, err)
		return ""
	}

	// 1. Get Path (and strip leading slash)
	path := u.Path
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}

	bucket := os.Getenv("GARAGE_BUCKET")

	// 2. Handle legacy /storage/ prefix format (old URLs)
	path = strings.TrimPrefix(path, "storage/")

	// 3. Remove Bucket Name from Path if present
	// Standard S3 path style: /bucket/key
	// Garage path style: /bucket/key
	prefix := bucket + "/"
	path = strings.TrimPrefix(path, prefix)

	// 4. Verification: If path is empty or just the bucket name, something is wrong
	if path == "" || path == bucket {
		fmt.Printf("Warning: Failed to extract path from URL: %s (Bucket: %s, Path: %s)\n", fileURL, bucket, path)
		return ""
	}

	return path
}

// DeleteFolder removes all objects with the given prefix (simulating folder deletion)
func DeleteFolder(prefix string) error {
	client, err := getS3Client()
	if err != nil {
		return err
	}

	bucket := aws.String(os.Getenv("GARAGE_BUCKET"))

	// List objects with prefix
	paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
		Bucket: bucket,
		Prefix: aws.String(prefix),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.TODO())
		if err != nil {
			return fmt.Errorf("failed to list objects for deletion: %w", err)
		}

		if len(page.Contents) == 0 {
			continue
		}

		// Prepare objects for deletion
		var objectIds []types.ObjectIdentifier
		for _, obj := range page.Contents {
			objectIds = append(objectIds, types.ObjectIdentifier{Key: obj.Key})
		}

		// Delete batch
		_, err = client.DeleteObjects(context.TODO(), &s3.DeleteObjectsInput{
			Bucket: bucket,
			Delete: &types.Delete{
				Objects: objectIds,
				Quiet:   aws.Bool(true),
			},
		})

		if err != nil {
			return fmt.Errorf("failed to delete batch from S3 storage: %w", err)
		}
	}
	return nil
}

// GetPresignedURL generates a presigned URL for secure, temporary access to a private object
// This allows authenticated users to access documents without making the bucket public
// ExtractBucketAndKeyFromURL extracts the bucket and object key from a storage URL
func ExtractBucketAndKeyFromURL(fileURL string) (string, string) {
	if fileURL == "" {
		return "", ""
	}

	u, err := url.Parse(fileURL)
	if err != nil {
		fmt.Printf("Error parsing URL %s: %v\n", fileURL, err)
		return "", ""
	}

	// 1. Get Path (and strip leading slash)
	path := u.Path
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}

	defaultBucket := os.Getenv("GARAGE_BUCKET")
	chatBucket := os.Getenv("GARAGE_CHAT_BUCKET")

	// 2. Handle legacy /storage/ prefix format (old URLs)
	path = strings.TrimPrefix(path, "storage/")

	// 3. Determine Bucket
	// Garage path style: /bucket/key
	// We need to check if the first segment is a known bucket

	parts := strings.SplitN(path, "/", 2)
	if len(parts) == 0 {
		return "", ""
	}

	bucket := defaultBucket // Default fallback
	key := path

	if parts[0] == defaultBucket {
		bucket = defaultBucket
		if len(parts) > 1 {
			key = parts[1]
		} else {
			key = ""
		}
	} else if chatBucket != "" && parts[0] == chatBucket {
		bucket = chatBucket
		if len(parts) > 1 {
			key = parts[1]
		} else {
			key = ""
		}
	} else {
		// If path doesn't start with a known bucket, assume it IS the key in the default bucket
		// This handles legacy cases where URL might not have bucket prefix if using subdomain style (though we configured path style)
		// But in our case, getPublicURL includes bucket.
		// If we are here, it might be an external URL or something else.
		// Let's assume default bucket and the whole path is the key if it doesn't match a bucket prefix.
		// However, if we forced path style, it SHOULD have bucket prefix.
		// Let's stick to the logic: if strictly matches known bucket, use it.
	}

	return bucket, key
}

// GetPresignedURL generates a presigned URL for secure, temporary access to a private object
func GetPresignedURL(bucketName, objectKey string, expiryMinutes int) (string, error) {
	if bucketName == "" {
		bucketName = os.Getenv("GARAGE_BUCKET")
	}
	if bucketName == "" {
		return "", fmt.Errorf("GARAGE_BUCKET env var is not set")
	}

	// ... (rest of configuration is same, referencing Public URL)
	publicURL := os.Getenv("GARAGE_PUBLIC_URL")
	if publicURL == "" {
		return "", fmt.Errorf("GARAGE_PUBLIC_URL env var is not set")
	}

	if len(publicURL) > 0 && publicURL[len(publicURL)-1] == '/' {
		publicURL = publicURL[:len(publicURL)-1]
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			os.Getenv("GARAGE_ACCESS_KEY"),
			os.Getenv("GARAGE_SECRET_KEY"),
			"",
		)),
		config.WithRegion(os.Getenv("GARAGE_REGION")),
	)

	if err != nil {
		return "", fmt.Errorf("failed to load AWS config: %w", err)
	}

	presignClient := s3.NewPresignClient(
		s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(publicURL)
			o.UsePathStyle = true
		}),
	)

	presignResult, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket:                     aws.String(bucketName),
		Key:                        aws.String(objectKey),
		ResponseContentDisposition: aws.String("inline"),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expiryMinutes) * time.Minute
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return presignResult.URL, nil
}

// GenerateSignedProfileURL takes a stored DB URL and returns a browser-accessible URL
func GenerateSignedProfileURL(originalURL string) string {
	if originalURL == "" {
		return ""
	}

	bucket, key := ExtractBucketAndKeyFromURL(originalURL)
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

// GenerateSignedDocumentURL takes a stored DB URL and returns a browser-accessible URL for documents
func GenerateSignedDocumentURL(originalURL string) string {
	if originalURL == "" {
		return ""
	}

	bucket, key := ExtractBucketAndKeyFromURL(originalURL)
	if bucket == "" || key == "" {
		return originalURL
	}

	// Clean query params from key
	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	publicURL, err := GetBrowserAccessibleURL(bucket, key)
	if err != nil {
		fmt.Printf("Error generating document URL: %v\n", err)
		return originalURL
	}
	return publicURL
}

// SanitizeFileName replaces non-alphanumeric characters with underscores
func SanitizeFileName(name string) string {
	// Simple sanitizer: replace spaces and special chars with _
	// Allow a-z, A-Z, 0-9, -, _
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		} else {
			result.WriteRune('_')
		}
	}
	return result.String()
}

// UploadToS3Bucket uploads a file to a specific S3 bucket
func UploadToS3Bucket(file multipart.File, fileHeader *multipart.FileHeader, path string, bucketName string) (string, error) {
	client, err := getS3Client()
	if err != nil {
		return "", err
	}

	// Read file into buffer
	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	if bucketName == "" {
		bucketName = os.Getenv("GARAGE_BUCKET")
	}

	// Ensure Bucket Exists
	_, err = client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		fmt.Printf("Bucket %s not found, attempting to create...\n", bucketName)
		_, err = client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
			Bucket: aws.String(bucketName),
		})
		if err != nil {
			fmt.Printf("Warning: Failed to create bucket %s (might exist): %v\n", bucketName, err)
			// return "", fmt.Errorf("failed to create bucket: %w", err) // Don't return error
		}

		// Set Bucket Policy
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {"AWS": ["*"]},
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
				}
			]
		}`, bucketName)

		_, err = client.PutBucketPolicy(context.TODO(), &s3.PutBucketPolicyInput{
			Bucket: aws.String(bucketName),
			Policy: aws.String(policy),
		})
		if err != nil {
			fmt.Printf("Warning: Failed to set bucket policy: %v\n", err)
		}
	}

	// Detect Content-Type
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(buf.Bytes())
	}

	// Upload
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:             aws.String(bucketName),
		Key:                aws.String(path),
		Body:               bytes.NewReader(buf.Bytes()),
		ContentType:        aws.String(contentType),
		ContentDisposition: aws.String("inline"),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3 storage: %w", err)
	}

	return getPublicURL(bucketName, path), nil
}

// InitChatBucket ensures the chat bucket exists
func InitChatBucket() error {
	bucketName := os.Getenv("GARAGE_CHAT_BUCKET")
	if bucketName == "" {
		// Fallback or skip if not configured
		fmt.Println("GARAGE_CHAT_BUCKET not set, skipping specific init")
		return nil
	}

	client, err := getS3Client()
	if err != nil {
		return err
	}

	_, err = client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})

	if err != nil {
		fmt.Printf("Chat Bucket %s not found, creating...\n", bucketName)
		_, err = client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
			Bucket: aws.String(bucketName),
		})
		if err != nil {
			// If we can't create it, we assume it exists or we don't have permissions.
			// accessing it later will fail if it really doesn't exist/no access.
			// But failing here blocks startup/upload for no reason if it DOES exist.
			fmt.Printf("Warning: Failed to create chat bucket (might already exist or permission denied): %v\n", err)
		} else {
			// Only try to set policy if we created it or if we want to enforce it.
			// If we couldn't create, we probably can't set policy either.
			// But let's try setting policy only if creation succeeded or we didn't just fail.
			// Actually, if creation failed, we should probably skip policy to avoid another error.
		}

		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {"AWS": ["*"]},
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
				}
			]
		}`, bucketName)

		_, err = client.PutBucketPolicy(context.TODO(), &s3.PutBucketPolicyInput{
			Bucket: aws.String(bucketName),
			Policy: aws.String(policy),
		})
		if err != nil {
			return fmt.Errorf("failed to set chat bucket policy: %w", err)
		}
	}

	fmt.Printf("Chat Bucket %s initialized\n", bucketName)
	return nil
}
