package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// CreateDrive - Only for Admins
// @Summary Create a new placement drive
// @Description Create a new drive with companies details (Admin only)
// @Tags Drives
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param drive body models.CreateDriveInput true "Drive Details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives [post]
func CreateDrive(c *fiber.Ctx) error {
	// 1. Parse Input
	var input models.CreateDriveInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// 2. Get Admin ID from Token (set by Middleware)
	adminID := c.Locals("user_id").(float64) // JWT claims are often float64

	// 3. Convert Dates safely
	deadline, _ := time.Parse("2006-01-02", input.DeadlineDate)
	driveDateParsed, _ := time.Parse("2006-01-02", input.DriveDate)

	var pgDate pgtype.Date
	pgDate.Scan(driveDateParsed) // Convert Go time to Postgres Date

	// 4. Populate Model
	drive := models.PlacementDrive{
		PostedBy:           int64(adminID),
		CompanyName:        input.CompanyName,
		JobRole:            input.JobRole,
		JobDescription:     input.JobDescription,
		Location:           input.Location,
		DriveType:          input.DriveType,
		CompanyCategory:    input.CompanyCategory,
		CtcMin:             input.CtcMin,
		CtcMax:             input.CtcMax,
		CtcDisplay:         input.CtcDisplay,
		MinCgpa:            input.MinCgpa,
		MaxBacklogsAllowed: input.MaxBacklogsAllowed,
		DeadlineDate:       deadline,
		DriveDate:          pgDate,
	}

	// 5. Save to DB
	repo := repository.NewDriveRepository(database.DB)
	if err := repo.CreateDrive(c.Context(), &drive); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to post drive", "details": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{"message": "Drive posted successfully", "id": drive.ID})
}

// ListDrives - For Students & Admins
// @Summary List all placement drives
// @Description Get a list of drives with optional filtering
// @Tags Drives
// @Produce json
// @Security BearerAuth
// @Param category query string false "Company Category"
// @Param min_salary query int false "Minimum Salary"
// @Param type query string false "Drive Type"
// @Success 200 {array} models.PlacementDrive
// @Failure 500 {object} map[string]interface{}
// @Router /v1/drives [get]
func ListDrives(c *fiber.Ctx) error {
	// 1. Check User Role
	// Middleware creates "role" and "user_id" locals
	role := c.Locals("role").(string)
	userID := int64(c.Locals("user_id").(float64))

	repo := repository.NewDriveRepository(database.DB)

	// A. STUDENT VIEW: Smart Eligibility Filter
	if role == "student" {
		drives, err := repo.GetEligibleDrives(c.Context(), userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch eligible drives", "details": err.Error()})
		}
		return c.JSON(drives)
	}

	// B. ADMIN VIEW: List All with Filters
	filters := make(map[string]interface{})

	// Extract Query Params (e.g., /api/drives?category=IT)
	if cat := c.Query("category"); cat != "" {
		filters["category"] = cat
	}
	if sal := c.Query("min_salary"); sal != "" {
		// Convert string "500000" to int
		if salInt, err := strconv.Atoi(sal); err == nil {
			filters["min_salary"] = salInt
		}
	}
	if dtype := c.Query("type"); dtype != "" {
		filters["type"] = dtype
	}

	drives, err := repo.GetDrives(c.Context(), filters)
	if err != nil {
		fmt.Println("Error fetching drives:", err) // Debug log
		return c.Status(500).JSON(fiber.Map{"error": "Could not fetch drives"})
	}

	return c.JSON(drives)
}

// UpdateDrive - Handles PUT requests
// @Summary Update a placement drive
// @Description Update existing drive details (Admin only)
// @Tags Drives
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param drive body models.CreateDriveInput true "Drive Details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives/{id} [put]
func UpdateDrive(c *fiber.Ctx) error {
	// 1. Get Drive ID
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	// 2. Parse Updates
	var input models.CreateDriveInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// 3. Convert Dates (Reuse the logic from CreateDrive)
	deadline, _ := time.Parse(time.RFC3339, input.DeadlineDate) // Expect ISO format from frontend
	driveDateParsed, _ := time.Parse("2006-01-02", input.DriveDate)
	var pgDate pgtype.Date
	pgDate.Scan(driveDateParsed)

	drive := models.PlacementDrive{
		CompanyName:        input.CompanyName,
		JobRole:            input.JobRole,
		JobDescription:     input.JobDescription,
		Location:           input.Location,
		DriveType:          input.DriveType,
		CompanyCategory:    input.CompanyCategory,
		CtcMin:             input.CtcMin,
		CtcMax:             input.CtcMax,
		CtcDisplay:         input.CtcDisplay,
		MinCgpa:            input.MinCgpa,
		MaxBacklogsAllowed: input.MaxBacklogsAllowed,
		DeadlineDate:       deadline,
		DriveDate:          pgDate,
	}

	// 4. Update
	repo := repository.NewDriveRepository(database.DB)
	if err := repo.UpdateDrive(c.Context(), id, &drive); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Update failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Drive updated successfully"})
}

// DeleteDrive - Handles DELETE requests
// @Summary Delete a placement drive
// @Description Delete a drive by ID (Admin only)
// @Tags Drives
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives/{id} [delete]
func DeleteDrive(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	repo := repository.NewDriveRepository(database.DB)
	if err := repo.DeleteDrive(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Drive deleted successfully"})
}

// AdminManualRegister - Handles POST /admin/drives/:id/add-student
// @Summary Manually add a student to a drive
// @Description Admin forces a student registration for a drive
// @Tags Drives
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param input body models.ManualRegisterInput true "Student ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives/{id}/add-student [post]
func AdminManualRegister(c *fiber.Ctx) error {
	driveID, _ := strconv.ParseInt(c.Params("id"), 10, 64)

	// Admin sends JSON: { "student_id": 123 } or { "register_number": "24MCR029" }
	// Let's assume they send Student ID for now to keep it simple
	var input models.ManualRegisterInput

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Student ID is required"})
	}

	repo := repository.NewDriveRepository(database.DB)
	if err := repo.AdminForceRegister(c.Context(), driveID, input.StudentID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Manual registration failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Student manually added to drive"})
}
