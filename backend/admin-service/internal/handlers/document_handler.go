package handlers

import (
	"strings"

	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/placement-portal-kec/admin-service/internal/utils"
	"github.com/gofiber/fiber/v2"
)

// GetDocumentURL returns the direct URL for secure document access
// @Summary Get Document URL
// @Description Get the direct, permanent URL for accessing student documents
// @Tags Student
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param type path string true "Document Type" Enums(resume, aadhar, pan, profile_photo)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/student/documents/{type} [get]
func GetDocumentURL(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	role := c.Locals("role").(string)
	documentType := c.Params("type")

	// Validate document type
	validTypes := map[string]string{
		"resume":        "resume_url",
		"aadhar":        "aadhar_card_url",
		"pan":           "pan_card_url",
		"profile_photo": "profile_photo_url",
	}

	dbField, valid := validTypes[documentType]
	if !valid {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid document type. Must be one of: resume, aadhar, pan, profile_photo",
		})
	}

	// Get student's profile to find the document URL
	repo := repository.NewStudentRepository(database.DB)
	profile, err := repo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to fetch profile",
			"details": err.Error(),
		})
	}

	// Get the document URL from profile
	var documentURL string
	switch dbField {
	case "resume_url":
		documentURL = profile.ResumeURL
	case "profile_photo_url":
		documentURL = profile.ProfilePhotoURL
	}

	if documentURL == "" {
		return c.Status(404).JSON(fiber.Map{
			"error": "Document not uploaded yet",
		})
	}

	// Authorization check: students can only access their own documents, admins can access any
	if role != "admin" && role != "student" {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	// Extract S3 key using robust helper
	bucket, key := utils.ExtractBucketAndKeyFromURL(documentURL)
	if key == "" {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to parse document URL",
		})
	}
	// If bucket is empty, use default env
	if bucket == "" {
		bucket = utils.GetBucketName()
	}

	// Generate presigned URL (5-minute expiry)
	presignedURL, err := utils.GetPresignedURL(bucket, key, 5)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to generate secure URL",
			"details": err.Error(),
		})
	}

	// Return presigned URL
	return c.JSON(fiber.Map{
		"url":        presignedURL,
		"type":       documentType,
		"expires_in": "5 minutes",
	})
}

// GetStudentDocumentURL allows admins to get presigned URLs for any student's documents
// @Summary Get Student Document URL (Admin)
// @Description Generate a temporary presigned URL for accessing any student's documents
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param student_id path int true "Student User ID"
// @Param type path string true "Document Type" Enums(resume, aadhar, pan, profile_photo)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students/{student_id}/documents/{type} [get]
func GetStudentDocumentURL(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" {
		return c.Status(403).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	studentID, err := c.ParamsInt("student_id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid student ID",
		})
	}

	documentType := c.Params("type")

	// Validate document type
	validTypes := map[string]string{
		"resume":        "resume_url",
		"aadhar":        "aadhar_card_url",
		"pan":           "pan_card_url",
		"profile_photo": "profile_photo_url",
	}

	dbField, valid := validTypes[documentType]
	if !valid {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid document type. Must be one of: resume, aadhar, pan, profile_photo",
		})
	}

	// Get student's profile
	repo := repository.NewStudentRepository(database.DB)
	profile, err := repo.GetStudentFullProfile(c.Context(), int64(studentID))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).JSON(fiber.Map{
				"error": "Student not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to fetch student profile",
			"details": err.Error(),
		})
	}

	// Get the document URL
	var documentURL string
	switch dbField {
	case "resume_url":
		documentURL = profile.ResumeURL
	case "profile_photo_url":
		documentURL = profile.ProfilePhotoURL
	}

	if documentURL == "" {
		return c.Status(404).JSON(fiber.Map{
			"error": "Document not uploaded yet",
		})
	}

	// Extract S3 key using robust helper
	bucket, key := utils.ExtractBucketAndKeyFromURL(documentURL)
	if key == "" {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to parse document URL",
		})
	}
	// If bucket is empty, use default env
	if bucket == "" {
		bucket = utils.GetBucketName()
	}

	// Generate presigned URL (5-minute expiry)
	presignedURL, err := utils.GetPresignedURL(bucket, key, 5)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to generate secure URL",
			"details": err.Error(),
		})
	}

	// Return presigned URL
	return c.JSON(fiber.Map{
		"url":        presignedURL,
		"type":       documentType,
		"student_id": studentID,
		"expires_in": "5 minutes",
	})
}
