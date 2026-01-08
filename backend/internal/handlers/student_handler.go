package handlers

import (
	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// UpdateProfile updates the student's profile
// @Summary Update Profile
// @Description Update student profile information
// @Tags Student
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param profile body models.UpdateProfileInput true "Profile Data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/student/profile [put]
func UpdateProfile(c *fiber.Ctx) error {
	// 1. Get User ID from Token
	userID := int64(c.Locals("user_id").(float64))

	// 2. Parse Input
	var input models.UpdateProfileInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}

	// 3. Validation (Optional but recommended)
	if input.UgCgpa > 10.0 || input.PgCgpa > 10.0 {
		return c.Status(400).JSON(fiber.Map{"error": "CGPA cannot be greater than 10.0"})
	}

	// 4. Call Repository
	repo := repository.NewStudentRepository(database.DB)
	if err := repo.UpdateStudentProfile(c.Context(), userID, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}
