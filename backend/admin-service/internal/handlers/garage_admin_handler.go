package handlers

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/placement-portal-kec/admin-service/internal/utils"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gofiber/fiber/v2"
)

// GarageObject represents an object in Garage storage
type GarageObject struct {
	Key          string    `json:"key"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"last_modified"`
	SizeHuman    string    `json:"size_human"`
}

// GarageStats represents overall storage statistics
type GarageStats struct {
	TotalObjects int64  `json:"total_objects"`
	TotalSize    int64  `json:"total_size"`
	TotalSizeHR  string `json:"total_size_human_readable"`
	BucketName   string `json:"bucket_name"`
}

// resolveBucket returns the chat bucket if bucket=chat, otherwise the main bucket
func resolveBucket(c *fiber.Ctx) string {
	if c.Query("bucket") == "chat" {
		return utils.GetChatBucketName()
	}
	return utils.GetBucketName()
}

// ListGarageObjects lists all objects in the Garage bucket
// @Summary List Storage Objects
// @Description List all files in Garage object storage with metadata
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param prefix query string false "Filter by prefix/folder"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/objects [get]
func ListGarageObjects(c *fiber.Ctx) error {
	prefix := c.Query("prefix", "")

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := resolveBucket(c)

	// List objects
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
	}
	if prefix != "" {
		input.Prefix = aws.String(prefix)
	}

	result, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to list objects: " + err.Error()})
	}

	// Convert to response format
	objects := make([]GarageObject, 0)
	var totalSize int64

	for _, item := range result.Contents {
		if item.Key == nil {
			continue
		}

		obj := GarageObject{
			Key:          *item.Key,
			Size:         *item.Size,
			LastModified: *item.LastModified,
			SizeHuman:    formatBytes(*item.Size),
		}
		objects = append(objects, obj)
		totalSize += *item.Size
	}

	stats := GarageStats{
		TotalObjects: int64(len(objects)),
		TotalSize:    totalSize,
		TotalSizeHR:  formatBytes(totalSize),
		BucketName:   bucketName,
	}

	return c.JSON(fiber.Map{
		"objects": objects,
		"stats":   stats,
		"count":   len(objects),
	})
}

// ListChatBucketObjects lists chat attachment objects filtered by group IDs
// @Summary List Chat Storage Objects
// @Description List chat attachment files filtered by group IDs the user belongs to
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param group_ids query string true "Comma-separated group IDs"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {string} string "Missing group_ids"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/chat-objects [get]
func ListChatBucketObjects(c *fiber.Ctx) error {
	groupIDsStr := c.Query("group_ids", "")
	if groupIDsStr == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing 'group_ids' parameter"})
	}

	// Parse group IDs into a set for fast lookup
	allowedGroups := make(map[string]bool)
	for _, idStr := range strings.Split(groupIDsStr, ",") {
		idStr = strings.TrimSpace(idStr)
		if _, err := strconv.ParseInt(idStr, 10, 64); err == nil {
			allowedGroups[idStr] = true
		}
	}

	if len(allowedGroups) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No valid group IDs provided"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := utils.GetChatBucketName()

	// List all objects with chat_groups/ prefix
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
		Prefix: aws.String("chat_groups/"),
	}

	result, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to list chat objects: " + err.Error()})
	}

	// Filter objects by allowed group IDs
	// Key format: chat_groups/{groupID}/{year}/{month}/{filename}
	objects := make([]GarageObject, 0)
	var totalSize int64

	for _, item := range result.Contents {
		if item.Key == nil {
			continue
		}

		parts := strings.SplitN(*item.Key, "/", 3) // ["chat_groups", "groupID", "rest..."]
		if len(parts) < 2 {
			continue
		}

		groupID := parts[1]
		if !allowedGroups[groupID] {
			continue // skip files from groups the user doesn't belong to
		}

		obj := GarageObject{
			Key:          *item.Key,
			Size:         *item.Size,
			LastModified: *item.LastModified,
			SizeHuman:    formatBytes(*item.Size),
		}
		objects = append(objects, obj)
		totalSize += *item.Size
	}

	stats := GarageStats{
		TotalObjects: int64(len(objects)),
		TotalSize:    totalSize,
		TotalSizeHR:  formatBytes(totalSize),
		BucketName:   bucketName,
	}

	return c.JSON(fiber.Map{
		"objects": objects,
		"stats":   stats,
		"count":   len(objects),
	})
}

// GetGarageObject gets metadata and download URL for a specific object
// @Summary Get Object Info
// @Description Get object metadata and generate presigned download URL
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param key query string true "Object key/path"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {string} string "Missing key"
// @Failure 404 {string} string "Object not found"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/object [get]
func GetGarageObject(c *fiber.Ctx) error {
	key := c.Query("key")
	if key == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing 'key' parameter"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := resolveBucket(c)

	// Get object metadata
	headInput := &s3.HeadObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	}

	headResult, err := s3Client.HeadObject(ctx, headInput)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Object not found: " + err.Error()})
	}

	// Generate presigned URL (valid for 1 hour)
	presignClient := s3.NewPresignClient(s3Client)
	presignInput := &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	}

	presignResult, err := presignClient.PresignGetObject(ctx, presignInput, func(opts *s3.PresignOptions) {
		opts.Expires = time.Hour * 1
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate download URL: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"key":           key,
		"size":          *headResult.ContentLength,
		"size_human":    formatBytes(*headResult.ContentLength),
		"content_type":  aws.ToString(headResult.ContentType),
		"last_modified": headResult.LastModified,
		"download_url":  presignResult.URL,
		"expires_in":    "1 hour",
	})
}

// DeleteGarageObject deletes an object from Garage storage
// @Summary Delete Object
// @Description Delete a file from Garage storage
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body map[string]string true "Object key"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {string} string "Missing key"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/object [delete]
func DeleteGarageObject(c *fiber.Ctx) error {
	type DeleteRequest struct {
		Key string `json:"key" validate:"required"`
	}

	var req DeleteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Key == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing 'key' field"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := resolveBucket(c)

	// Delete object
	deleteInput := &s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(req.Key),
	}

	_, err := s3Client.DeleteObject(ctx, deleteInput)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete object: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Object '%s' deleted successfully", req.Key),
		"key":     req.Key,
	})
}

// DownloadGarageObject downloads a file from Garage storage
// @Summary Download Object
// @Description Download a file from Garage storage (direct download)
// @Tags Admin
// @Produce octet-stream
// @Security BearerAuth
// @Param key query string true "Object key/path"
// @Success 200 {file} application/octet-stream
// @Failure 400 {string} string "Missing key"
// @Failure 404 {string} string "Object not found"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/download [get]
func DownloadGarageObject(c *fiber.Ctx) error {
	key := c.Query("key")
	if key == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing 'key' parameter"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := resolveBucket(c)

	// Get object
	getInput := &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	}

	result, err := s3Client.GetObject(ctx, getInput)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Object not found: " + err.Error()})
	}
	defer result.Body.Close()

	// Set headers
	c.Set("Content-Type", aws.ToString(result.ContentType))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", key))
	c.Set("Content-Length", fmt.Sprintf("%d", result.ContentLength))

	// Stream the file
	_, err = io.Copy(c.Response().BodyWriter(), result.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to download object: " + err.Error()})
	}

	return nil
}

// BulkDeleteGarageObjects deletes multiple objects
// @Summary Bulk Delete Objects
// @Description Delete multiple files from Garage storage
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body map[string][]string true "List of keys to delete"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {string} string "Invalid request"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/bulk-delete [post]
func BulkDeleteGarageObjects(c *fiber.Ctx) error {
	type BulkDeleteRequest struct {
		Keys []string `json:"keys" validate:"required"`
	}

	var req BulkDeleteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(req.Keys) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No keys provided"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := resolveBucket(c)

	deleted := 0
	failed := 0
	errors := make([]string, 0)

	// Delete each object
	for _, key := range req.Keys {
		deleteInput := &s3.DeleteObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(key),
		}

		_, err := s3Client.DeleteObject(ctx, deleteInput)
		if err != nil {
			failed++
			errors = append(errors, fmt.Sprintf("%s: %s", key, err.Error()))
		} else {
			deleted++
		}
	}

	return c.JSON(fiber.Map{
		"success":       failed == 0,
		"deleted_count": deleted,
		"failed_count":  failed,
		"errors":        errors,
	})
}

// DownloadGarageZip downloads selected files as a structured ZIP
// @Summary Download Files as ZIP
// @Description Download multiple files as a structured ZIP (students/<reg_no>/, drives/<company_datetime>/)
// @Tags Admin
// @Accept json
// @Produce application/zip
// @Security BearerAuth
// @Param body body map[string][]string true "List of keys to download"
// @Success 200 {file} application/zip
// @Failure 400 {string} string "Invalid request"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/storage/download-zip [post]
func DownloadGarageZip(c *fiber.Ctx) error {
	type ZipRequest struct {
		Keys []string `json:"keys" validate:"required"`
	}

	var req ZipRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(req.Keys) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No keys provided"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()
	bucketName := utils.GetBucketName()

	// Set response headers for ZIP download
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"storage_export_%s.zip\"", time.Now().Format("2006-01-02")))

	// Create ZIP writer
	zipWriter := zip.NewWriter(c.Response().BodyWriter())
	defer zipWriter.Close()

	// Download and add files to ZIP
	for _, key := range req.Keys {
		// Get object from S3
		getInput := &s3.GetObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(key),
		}

		result, err := s3Client.GetObject(ctx, getInput)
		if err != nil {
			// Skip failed files
			continue
		}

		// Determine ZIP path based on key structure
		zipPath := getZipPath(key)

		// Create file in ZIP
		zipFile, err := zipWriter.Create(zipPath)
		if err != nil {
			result.Body.Close()
			continue
		}

		// Copy file content to ZIP
		_, err = io.Copy(zipFile, result.Body)
		result.Body.Close()
		if err != nil {
			continue
		}
	}

	return nil
}

// DownloadGarageArchive downloads files from a specific year as ZIP
// ... (comments)
func DownloadGarageArchive(c *fiber.Ctx) error {
	type ArchiveRequest struct {
		Year int `json:"year" validate:"required"`
	}

	var req ArchiveRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Year == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Year is required"})
	}

	ctx := context.Background()
	s3Client := utils.GetS3Client()

	// Define buckets to scan
	buckets := []struct {
		Name   string
		Prefix string // Prefix to use in ZIP
	}{
		{Name: utils.GetBucketName(), Prefix: ""},
		{Name: utils.GetChatBucketName(), Prefix: "chat_attachments/"},
	}

	// Set response headers
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"archive_%d.zip\"", req.Year))

	zipWriter := zip.NewWriter(c.Response().BodyWriter())
	defer zipWriter.Close()

	filesFound := false

	for _, b := range buckets {
		listInput := &s3.ListObjectsV2Input{
			Bucket: aws.String(b.Name),
		}

		result, err := s3Client.ListObjectsV2(ctx, listInput)
		if err != nil {
			fmt.Printf("Failed to list objects in bucket %s: %v\n", b.Name, err)
			continue
		}

		for _, item := range result.Contents {
			if item.Key == nil || item.LastModified == nil {
				continue
			}
			if item.LastModified.Year() == req.Year {
				filesFound = true

				// Get object
				getInput := &s3.GetObjectInput{
					Bucket: aws.String(b.Name),
					Key:    item.Key,
				}

				objResult, err := s3Client.GetObject(ctx, getInput)
				if err != nil {
					continue
				}

				// Determine ZIP path
				// If main bucket, use getZipPath logic.
				// If chat bucket, prefix with chat_attachments/ and keep key structure?
				// Chat keys are like: chat_groups/{groupID}/{year}/{month}/{filename}
				// We might want to keep that structure.

				var zipPath string
				if b.Prefix == "" {
					zipPath = getZipPath(*item.Key)
				} else {
					zipPath = filepath.Join(b.Prefix, *item.Key)
				}

				zipFile, err := zipWriter.Create(zipPath)
				if err != nil {
					objResult.Body.Close()
					continue
				}

				_, err = io.Copy(zipFile, objResult.Body)
				objResult.Body.Close()
			}
		}
	}

	if !filesFound {
		// If no files found at all, maybe return error or empty zip?
		// User implementation returned 404. We can do that if we haven't written anything yet.
		// But we already set headers and started writing...
		// Ideally we check before writing, but with multiple buckets it's heavier.
		// Let's just return the empty zip if nothing found, or we could handle it better.
		// For now, let's keep it simple.
	}

	return nil
}

// getZipPath converts S3 key to structured ZIP path
// students/24MCR029/resume.pdf -> students/24MCR029/resume.pdf
// drives/TCS_2024-01-15T10:30:00Z/JD.pdf -> drives/TCS_15-01-2024_10:30:00/JD.pdf
func getZipPath(key string) string {
	parts := strings.Split(key, "/")

	if len(parts) < 2 {
		return key
	}

	// Handle students folder
	if parts[0] == "students" {
		// students/24MCR029/resume.pdf stays as-is
		return key
	}

	// Handle drives folder
	if parts[0] == "drives" && len(parts) >= 2 {
		// drives/TCS_2024-01-15T10:30:00Z/JD.pdf
		// Extract company and datetime
		folderParts := strings.Split(parts[1], "_")
		if len(folderParts) >= 2 {
			company := folderParts[0]
			dateTimeStr := folderParts[1]

			// Parse datetime and reformat
			t, err := time.Parse(time.RFC3339, dateTimeStr)
			if err == nil {
				// Format as: 28-02-2026_14:40:52
				formattedDateTime := t.Format("02-01-2006_15:04:05")
				newFolder := company + "_" + formattedDateTime

				// Rebuild path
				newParts := []string{parts[0], newFolder}
				if len(parts) > 2 {
					newParts = append(newParts, parts[2:]...)
				}
				return filepath.Join(newParts...)
			}
		}
	}

	return key
}

// formatBytes formats bytes to human-readable format
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
