package handlers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/placement-portal-kec/admin-service/internal/utils"
	"github.com/gofiber/fiber/v2"
)

// UploadDocument - Uploads a document (resume, aadhar, pan, profile_pic)
// @Summary Upload Document
// @Description Upload student documents like Resume, Aadhar, Pan Card etc. to Object Storage (S3-compatible)
// @Tags Student
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param type query string true "Document Type (resume, aadhar, pan, profile_pic)"
// @Param file formData file true "File to upload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/student/upload [post]
func UploadDocument(c *fiber.Ctx) error {
	// 1. Get User ID from Token
	userID := int64(c.Locals("user_id").(float64))
	docType := c.Query("type")

	// Validation (Same as before)
	validTypes := map[string]bool{"resume": true, "aadhar": true, "pan": true, "profile_pic": true}
	if !validTypes[docType] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid document type"})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}

	// Max 1MB
	if fileHeader.Size > 1024*1024 {
		return c.Status(400).JSON(
			fiber.Map{"error": "File size exceeds 1MB limit"},
		)
	}

	// 2. Fetch Register Number
	repo := repository.NewUserRepository(database.DB)
	registerNumber, err := repo.GetRegisterNumber(c.Context(), userID)

	fmt.Println(registerNumber, err)

	if err != nil {
		// This fails if the student hasn't completed their profile yet
		return c.Status(404).JSON(fiber.Map{"error": "Profile incomplete: Register Number not found"})
	}

	// 3. Upload using Register Number
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file", "details": err.Error()})
	}
	defer file.Close()

	path := fmt.Sprintf("students/%s/%s", registerNumber, docType)
	url, err := utils.UploadToS3(file, fileHeader, path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Upload failed", "details": err.Error()})
	}

	// 4. Update Database
	// Note: We used to append ?v=timestamp for cache busting, but Garage storage
	// treats query parameters as part of the key, causing NoSuchKey errors.
	// We will handle cache invalidation on the client side.

	if err := repo.UpdateDocumentPath(c.Context(), userID, docType, url); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database update failed"})
	}

	return c.JSON(fiber.Map{
		"message":         "Upload successful",
		"register_number": registerNumber,
		"type":            docType,
		"url":             url,
	})
}

// UploadProfilePicture - Uploads a profile picture for the authenticated user
// @Summary Upload Profile Picture
// @Description Uploads a profile picture with role-based folder organization
// @Tags User
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "Profile Picture"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/user/upload/profile-photo [post]
func UploadProfilePicture(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}

	// Max 2MB for images
	if fileHeader.Size > 2*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File size exceeds 2MB limit"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	// 1. Fetch User Details to determine path
	repo := repository.NewUserRepository(database.DB)
	user, err := repo.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user details"})
	}

	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".jpg"
	}

	// 2. Determine S3 Path based on Role
	var path string
	userName := "user"
	if user.Name != nil && *user.Name != "" {
		userName = utils.SanitizeFileName(*user.Name) // Ensure we have a sanitizer or just basic regex
	}

	switch user.Role {
	case "super_admin":
		path = fmt.Sprintf("super_admin/%s/profile_pic%s", userName, ext)
	case "admin":
		path = fmt.Sprintf("admin/%s/profile_pic%s", userName, ext)
	case "coordinator":
		dept := "general"
		if user.DepartmentCode != nil {
			dept = *user.DepartmentCode
		}
		path = fmt.Sprintf("coordinators/%s_%s/profile_pic%s", userName, dept, ext)
	case "student":
		// For students, try to use Register Number if available, else UserID
		regNo, err := repo.GetRegisterNumber(c.Context(), userID)
		if err == nil && regNo != "" {
			path = fmt.Sprintf("students/%s/profile_pic%s", regNo, ext)
		} else {
			path = fmt.Sprintf("users/%d/profile_pic%s", userID, ext)
		}
	default:
		// Fallback
		path = fmt.Sprintf("users/%d/profile_pic%s", userID, ext)
	}

	// 3. Upload to S3
	url, err := utils.UploadToS3(file, fileHeader, path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Upload failed", "details": err.Error()})
	}

	// 4. Update Database
	if err := repo.UpdateUserProfile(c.Context(), userID, *user.Name, url); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database update failed"})
	}

	// Generate Presigned URL for immediate display
	signedURL := utils.GenerateSignedProfileURL(url)

	// Log Activity
	logRepo := repository.NewActivityLogRepository(database.DB)
	details, _ := json.Marshal(map[string]interface{}{
		"path": path,
	})
	_ = logRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     "UPLOAD_PROFILE_PICTURE",
		EntityType: "USER",
		EntityID:   strconv.FormatInt(userID, 10),
		Details:    details,
		IPAddress:  c.IP(),
	})

	return c.JSON(fiber.Map{
		"message": "Profile picture updated successfully",
		"url":     signedURL,
		"path":    path,
	})
}

// UploadCollegeLogo - Uploads the college logo (Super Admin)
// @Summary Upload College Logo
// @Description Uploads college logo and updates system settings
// @Tags SuperAdmin
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "Logo File"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/upload/college-logo [post]
func UploadCollegeLogo(c *fiber.Ctx) error {
	// Middleware should enforce Super Admin, but safe to check context if reused

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}

	if fileHeader.Size > 2*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File size exceeds 2MB limit"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	path := fmt.Sprintf("college/logo%s", ext)

	url, err := utils.UploadToS3(file, fileHeader, path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Upload failed", "details": err.Error()})
	}

	// Update System Settings
	settingsRepo := repository.NewSettingsRepository(database.DB)
	// Assuming userID 1 or from context for 'updated_by'
	userID := int64(c.Locals("user_id").(float64))

	if err := settingsRepo.UpdateSystemSetting(c.Context(), "college_logo_url", url, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database update failed"})
	}

	// Generate Presigned URL for immediate display
	signedURL := utils.GenerateSignedProfileURL(url)

	// Log Activity
	logRepo := repository.NewActivityLogRepository(database.DB)
	details, _ := json.Marshal(map[string]interface{}{
		"url": url,
	})
	_ = logRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     "UPLOAD_COLLEGE_LOGO",
		EntityType: "SETTINGS",
		EntityID:   "college_logo",
		Details:    details,
		IPAddress:  c.IP(),
	})

	return c.JSON(fiber.Map{
		"message": "College logo updated successfully",
		"url":     signedURL,
	})

}

// UploadChatAttachment - Uploads a file for chat
// @Summary Upload Chat Attachment
// @Description Uploads a file (image, doc, audio) for chat
// @Tags Chat
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "Attachment"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/chat/upload [post]
func UploadChatAttachment(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}

	// Max 10MB
	if fileHeader.Size > 10*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File size exceeds 10MB limit"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		// Try to guess from content type or default
		ext = ".bin"
	}

	// Use a random filename or timestamp to avoid collisions
	randomName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), utils.GenerateRandomString(8), ext)

	// Structure: chat_groups/{groupID}/{year}/{month}/{filename}
	groupID := c.FormValue("group_id")
	var path string
	if groupID != "" {
		now := time.Now()
		path = fmt.Sprintf("chat_groups/%s/%d/%02d/%s", groupID, now.Year(), now.Month(), randomName)
	} else {
		// Fallback for DMs that haven't been created yet or legacy
		path = fmt.Sprintf("chat_attachments/%d/%s", userID, randomName)
	}

	chatBucket := os.Getenv("GARAGE_CHAT_BUCKET")
	var url string
	if chatBucket != "" {
		url, err = utils.UploadToS3Bucket(file, fileHeader, path, chatBucket)
	} else {
		// Fallback to default
		url, err = utils.UploadToS3(file, fileHeader, path)
	}

	if err != nil {
		fmt.Printf("Error uploading to S3 (Bucket: %s, Path: %s): %v\n", chatBucket, path, err)
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Upload failed: %v", err), "details": err.Error()})
	}

	// Generate public or signed URL
	signedURL := utils.GenerateSignedProfileURL(url)

	return c.JSON(fiber.Map{
		"message": "Upload successful",
		"url":     signedURL,
		"path":    path,
		"name":    fileHeader.Filename,
		"size":    fileHeader.Size,
		"type":    fileHeader.Header.Get("Content-Type"),
	})
}
