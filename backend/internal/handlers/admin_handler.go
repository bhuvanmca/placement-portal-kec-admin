package handlers

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/services"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
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
	// Expected key columns: email, name, regNo, dept, batch_year, password (6 columns)
	if len(records) < 2 {
		return c.Status(400).JSON(fiber.Map{"error": "CSV file is empty"})
	}

	// Remove header row
	dataRows := records[1:]

	// 5. Call Repository
	repo := repository.NewUserRepository(database.DB)
	count, err := repo.BulkCreateStudents(c.Context(), dataRows)

	if err != nil {
		log.Println("Bulk upload error:", err)
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

	// 1. Cleanup S3 Folder
	regNo, err := repo.GetRegisterNumber(c.Context(), id)
	if err == nil && regNo != "" {
		folderPath := fmt.Sprintf("students/%s/", regNo)
		if err := utils.DeleteFolder(folderPath); err != nil {
			fmt.Printf("Failed to delete student folder %s: %v\n", folderPath, err)
		}
	}

	// 2. Delete from DB
	if err := repo.DeleteStudentById(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Delete failed", "details": err.Error()})
	}

	// Log Activity
	logRepo := repository.NewActivityLogRepository(database.DB)
	userID := int64(c.Locals("user_id").(float64))
	details, _ := json.Marshal(map[string]interface{}{
		"deleted_student_id": id,
		"reg_no":             regNo,
	})
	_ = logRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     "DELETE_STUDENT",
		EntityType: "STUDENT",
		EntityID:   strconv.FormatInt(id, 10),
		Details:    details,
		IPAddress:  c.IP(),
	})

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

	// 1. Cleanup S3 Folders (Fetch students first to get Reg Nos)
	// Passing limit: 10000 to fetch mostly all for cleanup (or we could fetch just RegNos via a specialized query, but this works given previous context)
	students, _, err := repo.GetStudents(c.Context(), input.Department, input.BatchYear, "", 10000, 0, "register_number", "asc")
	if err == nil {
		for _, s := range students {
			if s.RegisterNumber != "" {
				folderPath := fmt.Sprintf("students/%s/", s.RegisterNumber)
				if err := utils.DeleteFolder(folderPath); err != nil {
					fmt.Printf("Failed to delete student folder %s: %v\n", folderPath, err)
				}
			}
		}
	}

	// 2. Delete from DB
	count, err := repo.BulkDeleteStudents(c.Context(), input.Department, input.BatchYear)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Bulk delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Bulk delete successful",
		"count":   count, // Tell admin how many were removed
	})
}

// BulkDeleteStudentsByIds
// @Summary Bulk Delete Students by IDs
// @Description Delete multiple students using their IDs
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param ids body map[string][]int64 true "List of Student IDs"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students/delete-many [post]
func BulkDeleteStudentsByIds(c *fiber.Ctx) error {
	var input struct {
		IDs []int64 `json:"ids"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if len(input.IDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No IDs provided"})
	}

	repo := repository.NewUserRepository(database.DB)

	// 1. Cleanup S3 Folders
	regNos, err := repo.GetRegisterNumbersByIDs(c.Context(), input.IDs)
	if err == nil {
		for _, regNo := range regNos {
			if regNo != "" {
				folderPath := fmt.Sprintf("students/%s/", regNo)
				if err := utils.DeleteFolder(folderPath); err != nil {
					fmt.Printf("Failed to delete student folder %s: %v\n", folderPath, err)
				}
			}
		}
	}

	// 2. Delete from DB
	count, err := repo.BulkDeleteStudentsByIds(c.Context(), input.IDs)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Bulk delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Selected students deleted successfully",
		"count":   count,
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
	action := "UNBLOCK_USER"
	if input.Block {
		status = "blocked"
		action = "BLOCK_USER"
	}

	// Log Activity
	logRepo := repository.NewActivityLogRepository(database.DB)
	userID := int64(c.Locals("user_id").(float64))
	details, _ := json.Marshal(map[string]interface{}{
		"target_user_id": id,
		"new_status":     status,
	})
	_ = logRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     action,
		EntityType: "USER",
		EntityID:   strconv.FormatInt(id, 10),
		Details:    details,
		IPAddress:  c.IP(),
	})

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
		Remarks   string `json:"remarks"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	validStatuses := map[string]bool{"shortlisted": true, "placed": true, "rejected": true, "opted_in": true}
	if !validStatuses[input.Status] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid status value"})
	}

	// Call Repository (Reusing DriveRepo or ApplicationRepo)
	// Query: UPDATE drive_applications SET status = $1 WHERE drive_id = $2 AND student_id = $3
	repo := repository.NewDriveRepository(database.DB)
	userID := int64(c.Locals("user_id").(float64))

	if err := repo.UpdateApplicationStatus(c.Context(), input.DriveID, input.StudentID, input.Status, input.Remarks, userID); err != nil {
		if len(err.Error()) > 8 && err.Error()[:8] == "CONFLICT" {
			return c.Status(409).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
	}

	// Send Notification
	if input.Status == "opted_in" || input.Status == "rejected" {
		go func() {
			token, err := repo.GetStudentFCMToken(context.Background(), input.StudentID)
			if err == nil && token != "" {
				// Init Service (Assuming running from root)
				ns, err := services.NewNotificationService("firebase-service-account.json")
				if err == nil {
					title := "Application Update"
					body := ""
					if input.Status == "opted_in" {
						title = "Request Approved"
						body = "Your request to attend the drive has been approved."
					} else {
						title = "Request Rejected"
						body = "Your request to attend the drive has been rejected."
					}
					if input.Remarks != "" {
						body += fmt.Sprintf("\nRemarks: %s", input.Remarks)
					}

					_, err := ns.SendMulticastNotification(context.Background(), []string{token}, title, body, map[string]string{
						"type":     "drive_update",
						"drive_id": fmt.Sprintf("%d", input.DriveID),
					})
					if err != nil {
						fmt.Printf("Failed to send notification: %v\n", err)
					}
				} else {
					fmt.Printf("Failed to init notification service: %v\n", err)
				}
			}
		}()
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
	if batchStr != "" && batchStr != "All" {
		batchYear, _ = strconv.Atoi(batchStr)
	}

	// Pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Sorting
	sortBy := c.Query("sortBy", "register_number") // Default sort by register number
	sortOrder := c.Query("sortOrder", "asc")       // Default ascending

	repo := repository.NewUserRepository(database.DB)
	students, total, err := repo.GetStudents(c.Context(), dept, batchYear, search, limit, offset, sortBy, sortOrder)

	if err != nil {
		fmt.Println("Error fetching students:", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch students"})
	}

	// Presign Profile Photo URLs
	for i := range students {
		if students[i].ProfilePhotoURL != "" {
			students[i].ProfilePhotoURL = utils.GenerateSignedProfileURL(students[i].ProfilePhotoURL)
		}
	}

	return c.JSON(fiber.Map{
		"data": students,
		"meta": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetStudentDetails
// @Summary Get Student Details
// @Description Fetch full profile of a student by ID or Register Number
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param id path string true "Student ID or Register Number"
// @Success 200 {object} models.StudentFullProfile
// @Failure 404 {object} map[string]interface{}
// @Router /v1/admin/students/{id} [get]
func GetStudentDetails(c *fiber.Ctx) error {
	param := c.Params("id")

	// 1. Strictly find by Register Number
	// We no longer support fetching by internal integer ID for security and UX consistency.
	repo := repository.NewUserRepository(database.DB)
	userProfile, err := repo.GetStudentByRegisterNumber(c.Context(), param)
	if err == nil {
		// Presign Profile Photo URL
		if userProfile.ProfilePhotoURL != "" {
			userProfile.ProfilePhotoURL = utils.GenerateSignedProfileURL(userProfile.ProfilePhotoURL)
		}
		return c.JSON(userProfile)
	}
	// Log the error for debugging but return 404 to client
	// fmt.Printf("DEBUG: GetStudentByRegisterNumber failed for %s: %v\n", param, err)

	return c.Status(404).JSON(fiber.Map{"error": "Student not found"})
}

// GetDriveApplicants
// @Summary Get Drive Applicants
// @Description Fetch all students applied to a specific drive
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Success 200 {array} models.DriveApplicant
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives/{id}/applicants [get]
func GetDriveApplicants(c *fiber.Ctx) error {
	driveID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	repo := repository.NewDriveRepository(database.DB)
	applicants, err := repo.GetDriveApplicants(c.Context(), driveID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch applicants"})
	}

	return c.JSON(applicants)
}

// GetDriveRequests
// @Summary Get Drive Requests
// @Description Fetch all pending requests to attend drives
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.DriveApplicant
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drive-requests [get]
func GetDriveRequests(c *fiber.Ctx) error {
	repo := repository.NewDriveRepository(database.DB)
	requests, err := repo.GetDriveRequests(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch drive requests"})
	}

	for i := range requests {
		if requests[i].ResumeURL != "" {
			requests[i].ResumeURL = utils.GenerateSignedDocumentURL(requests[i].ResumeURL)
		}
		if requests[i].ProfilePhotoURL != "" {
			requests[i].ProfilePhotoURL = utils.GenerateSignedProfileURL(requests[i].ProfilePhotoURL)
		}
	}

	return c.JSON(requests)
}
