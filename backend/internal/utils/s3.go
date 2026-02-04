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

// getS3Client creates an S3-compatible client (MinIO)
func getS3Client() (*s3.Client, error) {
	useSSL := os.Getenv("MINIO_USE_SSL") == "true"

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			os.Getenv("MINIO_ACCESS_KEY"),
			os.Getenv("MINIO_SECRET_KEY"),
			"",
		)),
		config.WithRegion(os.Getenv("MINIO_LOCATION")),
	)

	if err != nil {
		return nil, err
	}

	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(func() string {
			endpoint := os.Getenv("MINIO_ENDPOINT")
			if useSSL {
				return "https://" + endpoint
			}
			return "http://" + endpoint
		}())
		o.UsePathStyle = true
	}), nil
}

// InitBucket ensures the configured bucket exists and has a public read policy
func InitBucket() error {
	client, err := getS3Client()
	if err != nil {
		return fmt.Errorf("failed to create s3 client: %w", err)
	}

	bucketName := os.Getenv("MINIO_BUCKET")
	if bucketName == "" {
		return fmt.Errorf("MINIO_BUCKET env var is not set")
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
			return fmt.Errorf("failed to create bucket: %w", err)
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

// getPublicURL generates a public URL for accessing uploaded files
// For MinIO: http://host:9000/bucket/path
func getPublicURL(bucket, path string) string {
	publicURL := os.Getenv("MINIO_PUBLIC_URL")
	// Ensure no trailing slash in publicURL
	if len(publicURL) > 0 && publicURL[len(publicURL)-1] == '/' {
		publicURL = publicURL[:len(publicURL)-1]
	}
	// Ensure no leading slash in path
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	return fmt.Sprintf("%s/%s/%s", publicURL, bucket, path)
}

// UploadToS3 uploads a file to S3-compatible storage and returns the Public URL
// Used in handlers: utils.UploadToS3(file, fileHeader, "resumes/24MCR029_resume.pdf")
// Compatible with MinIO
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

	bucketName := os.Getenv("MINIO_BUCKET")

	// Ensure Bucket Exists (MinIO/Local)
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
			return "", fmt.Errorf("failed to create bucket: %w", err)
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
		Bucket:      aws.String(bucketName),
		Key:         aws.String(path), // e.g. "24MCR029/resume.pdf"
		Body:        bytes.NewReader(buf.Bytes()),
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3 storage: %w", err)
	}

	// Generate Public URL using MinIO pattern
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
		Bucket: aws.String(os.Getenv("MINIO_BUCKET")),
		Key:    aws.String(path),
	})

	if err != nil {
		return fmt.Errorf("failed to delete from S3 storage: %w", err)
	}
	return nil
}

// ExtractPathFromURL extracts the object key from a storage URL
// Supports MinIO format (http://host/bucket/path)
func ExtractPathFromURL(fileURL string) string {
	u, err := url.Parse(fileURL)
	if err != nil {
		fmt.Printf("Error parsing URL %s: %v\n", fileURL, err)
		return ""
	}

	// Path is like /bucket/path/to/file
	path := u.Path
	// Remove leading slash
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}

	bucket := os.Getenv("MINIO_BUCKET")
	prefix := bucket + "/"

	if strings.HasPrefix(path, prefix) {
		return path[len(prefix):]
	}

	// Fallback: try legacy prefix match if available
	minioPrefix := fmt.Sprintf("%s/%s/", os.Getenv("MINIO_PUBLIC_URL"), bucket)
	if len(fileURL) > len(minioPrefix) && fileURL[:len(minioPrefix)] == minioPrefix {
		return fileURL[len(minioPrefix):]
	}

	fmt.Printf("Warning: Failed to extract path from URL: %s (Bucket: %s)\n", fileURL, bucket)
	return ""
}

// DeleteFolder removes all objects with the given prefix (simulating folder deletion)
func DeleteFolder(prefix string) error {
	client, err := getS3Client()
	if err != nil {
		return err
	}

	bucket := aws.String(os.Getenv("MINIO_BUCKET"))

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
func GetPresignedURL(objectKey string, expiryMinutes int) (string, error) {
	bucketName := os.Getenv("MINIO_BUCKET")
	if bucketName == "" {
		return "", fmt.Errorf("MINIO_BUCKET env var is not set")
	}

	// For presigned URLs, we need to use the public URL so external clients can access them
	// Create a separate client configuration with the public endpoint
	publicURL := os.Getenv("MINIO_PUBLIC_URL")
	if publicURL == "" {
		return "", fmt.Errorf("MINIO_PUBLIC_URL env var is not set")
	}

	// Remove trailing slash from publicURL if present
	if len(publicURL) > 0 && publicURL[len(publicURL)-1] == '/' {
		publicURL = publicURL[:len(publicURL)-1]
	}

	// Create AWS config with credentials
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			os.Getenv("MINIO_ACCESS_KEY"),
			os.Getenv("MINIO_SECRET_KEY"),
			"",
		)),
		config.WithRegion(os.Getenv("MINIO_LOCATION")),
	)

	if err != nil {
		return "", fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client with PUBLIC endpoint for presigning
	// This ensures the presigned URL uses the accessible hostname
	presignClient := s3.NewPresignClient(
		s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(publicURL)
			o.UsePathStyle = true
		}),
	)

	// Generate presigned GET request
	presignResult, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(objectKey),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expiryMinutes) * time.Minute
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return presignResult.URL, nil
}
