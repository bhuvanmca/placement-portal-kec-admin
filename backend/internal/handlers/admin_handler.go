package handlers

import (
	"encoding/csv"
	"fmt"
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// BulkUploadStudents
// @Summary Bulk Upload Students
// @Description Upload a CSV file to add multiple students at once
// @Tags Admin
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "CSV File"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students/bulk-upload [post]
func BulkUploadStudents(c *fiber.Ctx) error {
	// 1. Get the file from form-data
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "CSV file is required"})
	}

	// 2. Open the file
	src, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not open file"})
	}
	defer src.Close()

	// 3. Parse CSV
	reader := csv.NewReader(src)
	records, err := reader.ReadAll() // Reads all rows into memory
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid CSV format"})
	}

	// 4. Validation: Check headers
	// Expected: email, full_name, register_number, department, password
	if len(records) < 2 {
		return c.Status(400).JSON(fiber.Map{"error": "CSV file is empty"})
	}

	// Remove header row
	dataRows := records[1:]

	// 5. Call Repository
	repo := repository.NewUserRepository(database.DB)
	count, err := repo.BulkCreateStudents(c.Context(), dataRows)

	if err != nil {
		// Return exactly which row failed
		return c.Status(400).JSON(fiber.Map{
			"error":             "Bulk upload failed",
			"details":           err.Error(),
			"records_processed": count,
		})
	}

	return c.JSON(fiber.Map{
		"message":        "Bulk upload successful",
		"students_added": count,
	})
}

// DeleteStudent - DELETE /api/v1/admin/students/:id
// @Summary Delete Student
// @Description Delete a student by ID
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Student ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students/{id} [delete]
func DeleteStudent(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Student ID"})
	}

	repo := repository.NewUserRepository(database.DB)
	if err := repo.DeleteStudentById(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Student deleted successfully"})
}

// BulkDeleteStudents - DELETE /api/v1/admin/students/bulk
// @Summary Bulk Delete Students
// @Description Delete multiple students based on department and batch year
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param filters body string true "JSON with department and batch_year"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students/bulk [delete]
func BulkDeleteStudents(c *fiber.Ctx) error {
	// Parse JSON Body for filters
	var input struct {
		Department string `json:"department"`
		BatchYear  int    `json:"batch_year"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Safety check
	if input.Department == "" && input.BatchYear == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "You must provide a Department or Batch Year"})
	}

	repo := repository.NewUserRepository(database.DB)
	count, err := repo.BulkDeleteStudents(c.Context(), input.Department, input.BatchYear)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Bulk delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Bulk delete successful",
		"count":   count, // Tell admin how many were removed
	})
}

// ToggleBlockUser - PUT /api/v1/admin/users/:id/block
// @Summary Block/Unblock User
// @Description Block or Unblock a user to prevent login
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param input body map[string]bool true "Block status {block: true/false}"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/users/{id}/block [put]
func ToggleBlockUser(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)

	var input struct {
		Block bool `json:"block"` // true to block, false to unblock
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewUserRepository(database.DB)
	// We need to add this small helper in UserRepo
	if err := repo.SetUserBlockStatus(c.Context(), id, input.Block); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
	}

	status := "unblocked"
	if input.Block {
		status = "blocked"
	}
	return c.JSON(fiber.Map{"message": fmt.Sprintf("User %s successfully", status)})
}

// UpdateApplicationStatus - PUT /api/v1/admin/applications/status
// @Summary Update Application Status
// @Description Update the status of a student application (shortlisted, placed, rejected)
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body map[string]interface{} true "Status Update Data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/applications/status [put]
func UpdateApplicationStatus(c *fiber.Ctx) error {
	// Admin sends: { "drive_id": 10, "student_id": 55, "status": "placed" }
	var input struct {
		DriveID   int64  `json:"drive_id"`
		StudentID int64  `json:"student_id"`
		Status    string `json:"status"` // 'shortlisted', 'placed', 'rejected'
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	validStatuses := map[string]bool{"shortlisted": true, "placed": true, "rejected": true}
	if !validStatuses[input.Status] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid status value"})
	}

	// Call Repository (Reusing DriveRepo or ApplicationRepo)
	// Query: UPDATE drive_applications SET status = $1 WHERE drive_id = $2 AND student_id = $3
	repo := repository.NewDriveRepository(database.DB)
	if err := repo.UpdateApplicationStatus(c.Context(), input.DriveID, input.StudentID, input.Status); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
	}

	return c.JSON(fiber.Map{"message": "Student status updated"})
}

// ListStudents - GET /api/v1/admin/students?dept=MCA&batch=2026&search=hari
// @Summary List Students
// @Description Get a list of students with optional filtering by department, batch, or search
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param dept query string false "Department Code"
// @Param batch query int false "Batch Year"
// @Param search query string false "Search Term (Name/RegNum)"
// @Success 200 {array} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students [get]
func ListStudents(c *fiber.Ctx) error {
	dept := c.Query("dept")
	search := c.Query("search")

	batchStr := c.Query("batch")
	batchYear := 0
	if batchStr != "" {
		batchYear, _ = strconv.Atoi(batchStr)
	}

	repo := repository.NewUserRepository(database.DB)
	students, err := repo.GetStudents(c.Context(), dept, batchYear, search)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch students"})
	}

	return c.JSON(students)
}
