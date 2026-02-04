package handlers

import (
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// ApplyForDrive
// @Summary Apply for a Placement Drive
// @Description Allows a student to apply for a specific placement drive
// @Tags Application
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param input body map[string][]int64 false "Selected Role IDs"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/drives/{id}/apply [post]
func ApplyForDrive(c *fiber.Ctx) error {
	// 1. Get Student ID from Token
	studentID := int64(c.Locals("user_id").(float64))

	// 2. Get Drive ID from URL (/api/v1/drives/:id/apply)
	driveID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	// 3. Parse Role IDs (Optional/Required based on drive)
	var input struct {
		RoleIDs []int64 `json:"role_ids"`
	}
	// We ignore parsing error as body might be empty for simple drives
	c.BodyParser(&input)

	// 4. Call Repo
	repo := repository.NewApplicationRepository(database.DB)
	success, message, err := repo.ApplyForDrive(c.Context(), studentID, driveID, input.RoleIDs)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Internal Server Error" + err.Error()})
	}

	if !success {
		// Return 400 Bad Request if logic failed (e.g., Low CGPA, Deadline passed)
		return c.Status(400).JSON(fiber.Map{"success": false, "message": message})
	}

	return c.JSON(fiber.Map{"success": true, "message": message})
}

// WithdrawFromDrive
// @Summary Withdraw application for a Placement Drive
// @Description Allows a student to withdraw (opt-out) from a drive
// @Tags Application
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param input body map[string]string true "Reason"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/drives/{id}/withdraw [post]
func WithdrawFromDrive(c *fiber.Ctx) error {
	studentID := int64(c.Locals("user_id").(float64))
	driveID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	var input struct {
		Reason string `json:"reason"`
	}
	c.BodyParser(&input)

	repo := repository.NewApplicationRepository(database.DB)
	if err := repo.WithdrawApplication(c.Context(), studentID, driveID, input.Reason); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to withdraw: " + err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Successfully withdrawn from drive"})
}
