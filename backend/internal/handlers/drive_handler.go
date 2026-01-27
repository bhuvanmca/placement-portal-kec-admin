package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/services"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// 1. Create Drive (Admin Only)
// @Summary Create a new placement drive
// @Description Creates a drive with attachments
// @Tags Admin
// @Accept multipart/form-data
// @Produce json
// @Param drive_data formData string true "Drive Data JSON"
// @Param attachments formData file false "Attachments"
// @Router /v1/admin/drives [post]
func CreateDrive(c *fiber.Ctx) error {
	var input models.CreateDriveInput

	// A. Parse Multipart Form
	// 1. Parse Multipart Form
	form, err := c.MultipartForm()
	if err != nil {
		fmt.Printf("Error parsing multipart form: %v\n", err)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form data"})
	}

	// 2. Parse Drive Details (JSON string)
	driveDataStr := form.Value["drive_data"]
	if len(driveDataStr) == 0 {
		fmt.Println("Error: drive_data is missing")
		return c.Status(400).JSON(fiber.Map{"error": "Drive data is required"})
	}

	if err := json.Unmarshal([]byte(driveDataStr[0]), &input); err != nil {
		fmt.Printf("Error unmarshalling drive_data: %v\n", err)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	// Validate JSON Input
	validate := validator.New()
	if err := validate.Struct(input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Validation failed", "details": err.Error()})
	}

	// 3. Handle File Uploads (S3)
	files := form.File["attachments"]
	var attachments []models.Attachment

	fmt.Printf("Processing %d attachments for drive: %s\n", len(files), input.CompanyName)

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			fmt.Printf("Error opening file %s: %v\n", fileHeader.Filename, err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to process file"})
		}
		defer file.Close()

		// Generate path: drives/[company_name]_[date]/[filename]
		// input.DriveDate is "YYYY-MM-DD" string
		folderName := fmt.Sprintf("%s_%s", input.CompanyName, input.DriveDate)
		path := fmt.Sprintf("drives/%s/%s", folderName, fileHeader.Filename)

		fmt.Printf("Uploading file to path: %s\n", path)

		url, err := utils.UploadToS3(file, fileHeader, path)
		if err != nil {
			fmt.Printf("Error uploading to S3 storage: %v\n", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to upload to storage", "details": err.Error()})
		}
		attachments = append(attachments, models.Attachment{
			Name: fileHeader.Filename,
			URL:  url,
		})
	}

	// Assign uploaded attachments to input
	input.Attachments = append(input.Attachments, attachments...)

	// D. Convert Dates & Save
	pgDate := pgtype.Date{}
	if err := pgDate.Scan(input.DriveDate); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive Date format (YYYY-MM-DD)"})
	}

	deadline, err := time.Parse(time.RFC3339, input.DeadlineDate)
	if err != nil {
		// Try simplified date if ISO fails
		deadline, err = time.Parse("2006-01-02T15:04", input.DeadlineDate)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid Deadline format"})
		}
	}

	// Map input to proper model
	drive := models.PlacementDrive{
		PostedBy:            int64(c.Locals("user_id").(float64)),
		CompanyName:         input.CompanyName,
		JobRole:             input.JobRole,
		JobDescription:      input.JobDescription,
		Location:            input.Location,
		Website:             input.Website,
		LogoURL:             input.LogoURL,
		DriveType:           input.DriveType,
		CompanyCategory:     input.CompanyCategory,
		SpocID:              input.SpocID,
		CtcMin:              input.CtcMin,
		CtcMax:              input.CtcMax,
		CtcDisplay:          input.CtcDisplay,
		StipendMin:          input.StipendMin,
		StipendMax:          input.StipendMax,
		MinCgpa:             input.MinCgpa,
		TenthPercentage:     input.TenthPercentage,
		TwelfthPercentage:   input.TwelfthPercentage,
		UGMinCGPA:           input.UGMinCGPA,
		PGMinCGPA:           input.PGMinCGPA,
		UseAggregate:        input.UseAggregate,
		AggregatePercentage: input.AggregatePercentage,
		MaxBacklogsAllowed:  input.MaxBacklogsAllowed,
		EligibleBatches:     input.EligibleBatches,
		EligibleDepartments: input.EligibleDepartments,
		Rounds:              input.Rounds,
		Attachments:         input.Attachments,
		Status:              "draft", // Default status
		DeadlineDate:        deadline,
		DriveDate:           pgDate,
	}

	repo := repository.NewDriveRepository(database.DB)
	if err := repo.CreateDrive(c.Context(), drive); err != nil {
		fmt.Printf("Error creating drive in DB: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create drive", "details": err.Error()})
	}

	// E. Send Notification to Eligible Students (Async)
	go func(d models.PlacementDrive) {
		// 1. Fetch Tokens
		tokens, err := repo.GetEligibleStudentTokens(context.Background(), d)
		if err != nil {
			fmt.Printf("Notification Error: Failed to fetch eligible tokens: %v\n", err)
			return
		}

		if len(tokens) == 0 {
			fmt.Println("Notification: No eligible students with tokens found.")
			return
		}

		// 2. Initialize Service
		// Assuming config is in root
		ns, err := services.NewNotificationService("firebase-service-account.json")
		if err != nil {
			fmt.Printf("Notification Error: Failed to init service: %v. Make sure firebase-service-account.json is present.\n", err)
			return
		}

		// 3. Send
		title := "New Placement Drive!"
		body := fmt.Sprintf("%s is hiring for %s. Check eligibility now!", d.CompanyName, d.JobRole)
		data := map[string]string{
			"drive_id": strconv.FormatInt(d.ID, 10),
			"type":     "new_drive",
		}

		successCount, err := ns.SendMulticastNotification(context.Background(), tokens, title, body, data)
		if err != nil {
			fmt.Printf("Notification Error: Send failed: %v\n", err)
		} else {
			fmt.Printf("Notification Sent: Successfully sent to %d/%d devices.\n", successCount, len(tokens))
		}
	}(drive)

	// F. Send WhatsApp Broadcast (Async)
	go func(d models.PlacementDrive) {
		// 1. Fetch Numbers
		numbers, err := repo.GetEligibleStudentPhoneNumbers(context.Background(), d)
		if err != nil {
			fmt.Printf("WhatsApp Error: Failed to fetch eligible numbers: %v\n", err)
			return
		}

		if len(numbers) == 0 {
			fmt.Println("WhatsApp: No eligible students with numbers found.")
			return
		}

		// 2. Initialize Service
		waService := services.NewWhatsAppService()

		// 3. Send Template Message
		// Cloud API requires templates for business-initiated messages.
		// Template Name: new_placement_drive (assumption, user must create this in Meta Manager)
		// Variables: {{1}}=Company, {{2}}=Role, {{3}}=Deadline

		// If you haven't created a template yet, use "hello_world" (no params) for testing.
		// For now, let's assume a generic template "new_drive_alert" exists.
		// Or simpler: We just send "hello_world" to verify connectivity as requested.

		// Better approach: Since we can't create templates dynamically via API,
		// we will try to use the "hello_world" template which is standard for testing.
		// Once the user verifies, they can create a real template.

		templateName := "hello_world"
		var components []interface{} // No params for hello_world

		// If you have a custom template logic:
		/*
			templateName = "new_drive_alert"
			components = []interface{}{
				map[string]interface{}{
					"type": "body",
					"parameters": []map[string]string{
						{"type": "text", "text": d.CompanyName},
						{"type": "text", "text": d.JobRole},
						{"type": "text", "text": d.DeadlineDate.Format("02 Jan")},
					},
				},
			}
		*/

		count, _ := waService.SendBroadcast(numbers, templateName, components)
		fmt.Printf("WhatsApp Cloud Broadcast: Sent to %d/%d students.\n", count, len(numbers))
	}(drive)

	return c.Status(201).JSON(drive)
}

// ListStudentDrives - For Students (Filtered)
// @Summary List placement drives for students
// @Description Get a list of drives with optional filtering by department and batch
// @Tags Drives
// @Produce json
// @Security BearerAuth
// @Param department query string false "Department"
// @Param batch query int false "Batch Year"
// @Success 200 {array} models.PlacementDrive
// @Failure 500 {object} map[string]interface{}
// @Router /v1/drives [get]
func ListStudentDrives(c *fiber.Ctx) error {
	repo := repository.NewDriveRepository(database.DB)

	// Get Student ID from Token
	userID := int64(c.Locals("user_id").(float64))

	// Note: GetEligibleDrives filters internally by student's academic criteria (Dept, Batch, CGPA)
	// It returns drives the student is eligible for, WITH their application status.
	drives, err := repo.GetEligibleDrives(c.Context(), userID)
	if err != nil {
		fmt.Printf("Error fetching eligible drives: %v\n", err) // Debug log
		return c.Status(500).JSON(fiber.Map{"error": "Could not fetch drives"})
	}

	// Optional: We can still apply client-side-like filters (Category, Type) in memory if needed,
	// or update GetEligibleDrives to accept them.
	// For now, returning the eligible list is the priority to fix the Status Badge.

	// Check if we need to filter by query params (e.g. Type, Category)
	// Simple in-memory filter for now to preserve query param functionality
	filtered := []models.PlacementDrive{}
	cat := c.Query("category")
	dtype := c.Query("type")

	for _, d := range drives {
		if cat != "" && d.CompanyCategory != cat {
			continue
		}
		if dtype != "" && d.DriveType != dtype {
			continue
		}
		filtered = append(filtered, d)
	}

	return c.JSON(filtered)
}

// ListAdminDrives - For Admins (All Drives)
// @Summary List all placement drives for admin
// @Description Get a list of all drives without restriction
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.PlacementDrive
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives [get]
func ListAdminDrives(c *fiber.Ctx) error {
	repo := repository.NewDriveRepository(database.DB)

	// No filters for admin, they see everything
	filters := make(map[string]interface{})

	drives, err := repo.GetDrives(c.Context(), filters)
	if err != nil {
		fmt.Printf("Error fetching admin drives: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Could not fetch drives"})
	}

	return c.JSON(drives)
}

// UpdateDrive - Handles PUT requests
// @Summary Update a placement drive
// @Description Update existing drive details (Admin only). Supports multipart/form-data for adding files.
// @Tags Admin
// @Accept json,multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param drive_data formData string false "Updated Drive Data JSON (if multipart)"
// @Param attachments formData file false "New Attachments (if multipart)"
// @Param drive body models.CreateDriveInput false "Updated Drive Data (if json)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives/{id} [put]
func UpdateDrive(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid drive ID"})
	}

	var input models.CreateDriveInput
	var newAttachments []models.Attachment

	// Check if Multipart
	contentType := c.Get("Content-Type")
	isMultipart := false
	if len(contentType) >= 19 && contentType[:19] == "multipart/form-data" {
		isMultipart = true
	}

	if isMultipart {
		// 1. Parse Multipart
		form, err := c.MultipartForm()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid form data"})
		}

		// 2. Parse Drive Data
		driveDataStr := form.Value["drive_data"]
		if len(driveDataStr) > 0 {
			if err := json.Unmarshal([]byte(driveDataStr[0]), &input); err != nil {
				return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON in drive_data"})
			}
		}

		// 3. Handle File Uploads
		files := form.File["attachments"]
		if len(files) > 0 {
			// We need company name/date for folder path. Use existing or input.
			// Ideally we fetch existing drive first to get folder path if input is missing it.
			// But let's fetch existing drive later.
			// Temporary storage for files until we have drive info.
		}

		// We need to fetch drive first to generate paths if input doesn't have names
	} else {
		if err := c.BodyParser(&input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
		}
	}

	repo := repository.NewDriveRepository(database.DB)

	// Fetch existing drive
	drive, err := repo.GetDriveByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Drive not found"})
	}

	// If Multipart with Files, upload them now that we have drive info
	if isMultipart {
		form, _ := c.MultipartForm()
		files := form.File["attachments"]

		if len(files) > 0 {
			// Determine folder name from Drive (or Input if changed)
			companyName := drive.CompanyName
			if input.CompanyName != "" {
				companyName = input.CompanyName
			}

			driveDateStr := ""
			if drive.DriveDate.Valid {
				driveDateStr = drive.DriveDate.Time.Format("2006-01-02")
			}
			if input.DriveDate != "" {
				driveDateStr = input.DriveDate
			}

			// If date is missing, default to today? Or skip folder structure?
			if driveDateStr == "" {
				driveDateStr = time.Now().Format("2006-01-02")
			}

			// Upload
			for _, fileHeader := range files {
				file, err := fileHeader.Open()
				if err != nil {
					continue // Skip error files
				}
				defer file.Close()

				folderName := fmt.Sprintf("%s_%s", companyName, driveDateStr)
				path := fmt.Sprintf("drives/%s/%s", folderName, fileHeader.Filename)

				url, err := utils.UploadToS3(file, fileHeader, path)
				if err == nil {
					newAttachments = append(newAttachments, models.Attachment{
						Name: fileHeader.Filename,
						URL:  url,
					})
				}
			}
		}
	}

	// Update Fields
	if input.CompanyName != "" {
		drive.CompanyName = input.CompanyName
	}
	if input.JobRole != "" {
		drive.JobRole = input.JobRole
	}
	if input.JobDescription != "" {
		drive.JobDescription = input.JobDescription
	}
	if input.Location != "" {
		drive.Location = input.Location
	}
	if input.Website != "" {
		drive.Website = input.Website
	}
	if input.LogoURL != "" {
		drive.LogoURL = input.LogoURL
	}
	if input.DriveType != "" {
		drive.DriveType = input.DriveType
	}
	if input.CompanyCategory != "" {
		drive.CompanyCategory = input.CompanyCategory
	}
	if input.SpocID != 0 {
		drive.SpocID = input.SpocID
	}

	drive.CtcMin = input.CtcMin
	drive.CtcMax = input.CtcMax
	drive.CtcDisplay = input.CtcDisplay
	drive.StipendMin = input.StipendMin
	drive.StipendMax = input.StipendMax

	drive.MinCgpa = input.MinCgpa
	drive.MaxBacklogsAllowed = input.MaxBacklogsAllowed

	if len(input.EligibleBatches) > 0 {
		drive.EligibleBatches = input.EligibleBatches
	}
	if len(input.EligibleDepartments) > 0 {
		drive.EligibleDepartments = input.EligibleDepartments
	}
	if len(input.Rounds) > 0 {
		drive.Rounds = input.Rounds
	}

	// Attachments Logic:
	// If input.Attachments is provided (from JSON part), it contains the list of *kept* existing attachments.
	// We append newAttachments (uploaded files) to this list.
	// If input.Attachments is empty but we are in Multipart mode, we should be careful.
	// Assume `input.Attachments` reflects the desired state of *existing* attachments.

	// If input provided attachments (even empty list if explicit), use it.
	// But in Go, empty list is tricky.
	// We'll append newAttachments to whatever input provided.
	// Then, if the result is not empty, update drive.Attachments.
	// OR if we are explicitly updating, we should overwrite.

	combinedAttachments := input.Attachments
	if combinedAttachments == nil {
		combinedAttachments = []models.Attachment{}
	}
	combinedAttachments = append(combinedAttachments, newAttachments...)

	// Only update if we have changes or if explicit overwrite intent?
	// For now: update if combined list is not empty OR if input.Attachments was explicitly passed (empty).
	// Since we can't easily detect "explicitly passed empty" without pointers,
	// we will assume: if isMultipart, we definitely allow updating attachments.
	// If not multipart, check if input.Attachments > 0.

	if isMultipart || len(input.Attachments) > 0 {
		drive.Attachments = combinedAttachments
	}

	// Dates
	if input.DeadlineDate != "" {
		d, err := time.Parse(time.RFC3339, input.DeadlineDate)
		if err == nil {
			drive.DeadlineDate = d
		}
	}
	if input.DriveDate != "" {
		t, err := time.Parse("2006-01-02", input.DriveDate)
		if err == nil {
			var pgDate pgtype.Date
			pgDate.Scan(t)
			drive.DriveDate = pgDate
		}
	}

	if err := repo.UpdateDrive(c.Context(), id, drive); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update drive"})
	}

	// F. Send Notification to Eligible Students (Async)
	go func(d models.PlacementDrive) {
		// 1. Fetch Tokens
		tokens, err := repo.GetEligibleStudentTokens(context.Background(), d)
		if err != nil {
			fmt.Printf("Notification Error: Failed to fetch eligible tokens for update: %v\n", err)
			return
		}

		if len(tokens) == 0 {
			fmt.Println("Notification: No eligible students with tokens found for update.")
			return
		}

		// 2. Initialize Service
		ns, err := services.NewNotificationService("firebase-service-account.json")
		if err != nil {
			fmt.Printf("Notification Error: Failed to init service: %v.\n", err)
			return
		}

		// 3. Send
		title := "Placement Drive Updated"
		body := fmt.Sprintf("Updates have been made to %s (%s). Check for changes or deadline extensions.", d.CompanyName, d.JobRole)
		data := map[string]string{
			"drive_id": strconv.FormatInt(d.ID, 10),
			"type":     "drive_update",
		}

		successCount, err := ns.SendMulticastNotification(context.Background(), tokens, title, body, data)
		if err != nil {
			fmt.Printf("Notification Error: Send failed: %v\n", err)
		} else {
			fmt.Printf("Notification Sent: Successfully sent to %d/%d devices.\n", successCount, len(tokens))
		}
	}(*drive)

	return c.JSON(fiber.Map{"message": "Drive updated successfully", "drive": drive})
}

// DeleteDrive - Handles DELETE requests
// @Summary Delete a placement drive
// @Description Delete a drive by ID (Admin only)
// @Tags Admin
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

	// 1. Fetch Drive Details to get attachments
	drive, err := repo.GetDriveByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Drive not found"})
	}

	// 2. Delete Attachments Folder from S3 Storage
	// Reconstruct folder name: drives/[company_name]_[date]
	if !drive.DriveDate.Valid {
		// Log error or handle gracefully? skipping deletion if date invalid
		fmt.Println("Drive date invalid, cannot reconstruct folder path for deletion")
	} else {
		dateStr := drive.DriveDate.Time.Format("2006-01-02")
		folderName := fmt.Sprintf("%s_%s", drive.CompanyName, dateStr)
		prefix := fmt.Sprintf("drives/%s/", folderName)

		if err := utils.DeleteFolder(prefix); err != nil {
			fmt.Printf("Failed to delete drive folder %s: %v\n", prefix, err)
		}
	}

	// 3. Delete from DB
	if err := repo.DeleteDrive(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Drive and attachments deleted successfully"})
}

// BulkDeleteDrives - DELETE /v1/admin/drives/bulk-delete
// @Summary Bulk Delete Drives
// @Description Delete multiple drives by IDs
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param ids body map[string][]int64 true "List of Drive IDs"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/drives/bulk-delete [post]
func BulkDeleteDrives(c *fiber.Ctx) error {
	var input struct {
		IDs []int64 `json:"ids"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if len(input.IDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No IDs provided"})
	}

	repo := repository.NewDriveRepository(database.DB)

	// 1. Fetch Drives to get attachments
	drives, err := repo.GetDrivesByIDs(c.Context(), input.IDs)
	if err != nil {
		fmt.Printf("Error fetching drives for bulk delete cleanup: %v\n", err)
		// Proceeding anyway? Maybe better to log and try best effort.
	}

	// 2. Delete Attachments from S3 Storage
	for _, drive := range drives {
		if !drive.DriveDate.Valid {
			continue
		}
		dateStr := drive.DriveDate.Time.Format("2006-01-02")
		folderName := fmt.Sprintf("%s_%s", drive.CompanyName, dateStr)
		prefix := fmt.Sprintf("drives/%s/", folderName)

		if err := utils.DeleteFolder(prefix); err != nil {
			fmt.Printf("Failed to delete drive folder %s: %v\n", prefix, err)
		}
	}

	// 3. Delete from DB
	count, err := repo.BulkDeleteDrives(c.Context(), input.IDs)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Bulk delete failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Bulk delete successful",
		"count":   count,
	})
}

// AdminManualRegister - Handles POST /admin/drives/:id/add-student
// @Summary Manually add a student to a drive
// @Description Admin forces a student registration for a drive
// @Tags Admin
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
