package handlers

import (
	"context"
	"fmt"
	"log"
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/services"
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

// RequestToAttendDrive
// @Summary Request to attend a drive (for ineligible students)
// @Description Allows a student who doesn't meet academic criteria to request attendance
// @Tags Application
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/drives/{id}/request-attend [post]
func RequestToAttendDrive(c *fiber.Ctx) error {
	studentID := int64(c.Locals("user_id").(float64))
	driveID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	// Parse role IDs from body (optional)
	var input struct {
		RoleIDs []int64 `json:"role_ids"`
	}
	c.BodyParser(&input)

	// 1. Record the request
	repo := repository.NewApplicationRepository(database.DB)
	if err := repo.RequestToAttend(c.Context(), studentID, driveID, input.RoleIDs); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to submit request: " + err.Error()})
	}

	// 2. Send notification to admins (async)
	go func() {
		driveRepo := repository.NewDriveRepository(database.DB)
		ns, err := services.NewNotificationService("firebase-service-account.json")
		if err != nil {
			log.Printf("Failed to init notification service: %v", err)
			return
		}

		// Get student name
		var studentName string
		err = database.DB.QueryRow(context.Background(),
			"SELECT name FROM users WHERE id = $1", studentID).Scan(&studentName)
		if err != nil {
			studentName = fmt.Sprintf("Student #%d", studentID)
		}

		// Get drive company name
		var companyName string
		err = database.DB.QueryRow(context.Background(),
			"SELECT company_name FROM placement_drives WHERE id = $1", driveID).Scan(&companyName)
		if err != nil {
			companyName = fmt.Sprintf("Drive #%d", driveID)
		}

		tokens, err := driveRepo.GetAdminFCMTokens(context.Background())
		if err != nil || len(tokens) == 0 {
			log.Printf("No admin tokens found or error: %v", err)
			return
		}

		title := "Request to Attend Drive"
		body := fmt.Sprintf("%s has requested to attend the %s drive (does not meet eligibility criteria)", studentName, companyName)
		data := map[string]string{
			"type":       "request_to_attend",
			"drive_id":   fmt.Sprintf("%d", driveID),
			"student_id": fmt.Sprintf("%d", studentID),
		}

		_, err = ns.SendMulticastNotification(context.Background(), tokens, title, body, data)
		if err != nil {
			log.Printf("Failed to notify admins about request-to-attend: %v", err)
		}
	}()

	return c.JSON(fiber.Map{"success": true, "message": "Request submitted. Admin will be notified."})
}

// GetMyDriveRequests handles GET /api/v1/student/drive-requests
func GetMyDriveRequests(c *fiber.Ctx) error {
	studentID := int64(c.Locals("user_id").(float64))
	repo := repository.NewApplicationRepository(database.DB)

	requests, err := repo.GetStudentDriveRequests(c.Context(), studentID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch drive requests"})
	}

	return c.JSON(requests)
}

// BulkUpdateDriveRequestStatus handles PUT /api/v1/admin/applications/bulk-status
func BulkUpdateDriveRequestStatus(c *fiber.Ctx) error {
	adminID := int64(c.Locals("user_id").(float64))

	var input struct {
		Requests []struct {
			DriveID   int64 `json:"drive_id"`
			StudentID int64 `json:"student_id"`
		} `json:"requests"`
		Status  string `json:"status"`
		Remarks string `json:"remarks"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(input.Requests) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No requests provided"})
	}

	if input.Status != "opted_in" && input.Status != "rejected" {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid status. Use 'opted_in' or 'rejected'"})
	}

	// Convert to the repo's expected type
	type reqPair struct {
		DriveID   int64
		StudentID int64
	}
	pairs := make([]struct {
		DriveID   int64
		StudentID int64
	}, len(input.Requests))
	for i, r := range input.Requests {
		pairs[i] = struct {
			DriveID   int64
			StudentID int64
		}{DriveID: r.DriveID, StudentID: r.StudentID}
	}

	driveRepo := repository.NewDriveRepository(database.DB)
	affected, err := driveRepo.BulkUpdateApplicationStatus(c.Context(), pairs, input.Status, input.Remarks, adminID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to bulk update: " + err.Error()})
	}

	action := "approved"
	if input.Status == "rejected" {
		action = "rejected"
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  fmt.Sprintf("Successfully %s %d request(s)", action, affected),
		"affected": affected,
	})
}
