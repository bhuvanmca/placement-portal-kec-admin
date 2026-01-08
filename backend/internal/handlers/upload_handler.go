package handlers

import (
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/gofiber/fiber/v2"
)

// UploadDocument - Uploads a document (resume, aadhar, pan, profile_pic)
// @Summary Upload Document
// @Description Upload student documents like Resume, Aadhar, Pan Card etc. to Cloudinary
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

	// 2. Fetch Register Number
	repo := repository.NewUserRepository(database.DB)
	registerNumber, err := repo.GetRegisterNumber(c.Context(), userID)

	fmt.Println(registerNumber, err)

	if err != nil {
		// This fails if the student hasn't completed their profile yet
		return c.Status(404).JSON(fiber.Map{"error": "Profile incomplete: Register Number not found"})
	}

	// 3. Upload using Register Number
	url, err := utils.UploadToCloudinary(fileHeader, registerNumber, docType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Upload failed", "details": err.Error()})
	}

	// 4. Update Database
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
