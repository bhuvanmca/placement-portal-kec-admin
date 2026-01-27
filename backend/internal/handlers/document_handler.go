package handlers

import (
	"strings"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/gofiber/fiber/v2"
)

// GetDocumentURL generates a presigned URL for secure document access
// @Summary Get Document URL
// @Description Generate a temporary presigned URL for accessing student documents
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
	case "aadhar_card_url":
		documentURL = profile.AadharCardURL
	case "pan_card_url":
		documentURL = profile.PanCardURL
	case "profile_photo_url":
		documentURL = profile.ProfilePhotoURL
	}

	if documentURL == "" {
		return c.Status(404).JSON(fiber.Map{
			"error": "Document not uploaded yet",
		})
	}

	// Extract the object key from the full URL
	// e.g., "http://172.20.10.6:9000/placement-portal-bucket/students/24MCR005/resume.pdf"
	// -> "students/24MCR005/resume.pdf"
	objectKey := utils.ExtractPathFromURL(documentURL)
	if objectKey == "" {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to parse document URL",
		})
	}

	// Authorization check: students can only access their own documents, admins can access any
	if role != "admin" && role != "student" {
		return c.Status(403).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	// Generate presigned URL (valid for 7 days = 10080 minutes)
	presignedURL, err := utils.GetPresignedURL(objectKey, 10080)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to generate document URL",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"url":        presignedURL,
		"expires_in": "7 days",
		"type":       documentType,
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
	case "aadhar_card_url":
		documentURL = profile.AadharCardURL
	case "pan_card_url":
		documentURL = profile.PanCardURL
	case "profile_photo_url":
		documentURL = profile.ProfilePhotoURL
	}

	if documentURL == "" {
		return c.Status(404).JSON(fiber.Map{
			"error": "Document not uploaded yet",
		})
	}

	// Extract object key
	objectKey := utils.ExtractPathFromURL(documentURL)
	if objectKey == "" {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to parse document URL",
		})
	}

	// Generate presigned URL (valid for 7 days)
	presignedURL, err := utils.GetPresignedURL(objectKey, 10080)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to generate document URL",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"url":        presignedURL,
		"expires_in": "7 days",
		"type":       documentType,
		"student_id": studentID,
	})
}
