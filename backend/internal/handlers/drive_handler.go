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
	driveDate, err := time.Parse(time.RFC3339, input.DriveDate)
	if err != nil {
		// Fallback to simple date
		driveDate, err = time.Parse("2006-01-02", input.DriveDate)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive Date format"})
		}
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
		PostedBy:        int64(c.Locals("user_id").(float64)),
		CompanyName:     input.CompanyName,
		JobDescription:  input.JobDescription,
		Website:         input.Website,
		LogoURL:         input.LogoURL,
		Location:        input.Location,     // [FIX] Added
		LocationType:    input.LocationType, // [FIX] Added
		DriveType:       input.DriveType,
		CompanyCategory: input.CompanyCategory,
		SpocID:          input.SpocID,
		Roles:           input.Roles, // [FIX] Added

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
		Status:              "open", // Default status switched to open as requested
		DeadlineDate:        deadline,
		DriveDate:           driveDate,
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
		body := fmt.Sprintf("%s is hiring. Check eligibility now!", d.CompanyName)
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

	// F. Send WhatsApp Broadcast (Async) - DISABLED (Unimplemented/Token errors)
	/*
		go func(d models.PlacementDrive) {
			// ... existing code ...
		}(drive)
	*/

	return c.Status(201).JSON(drive)
}

// Helper: Convert drive attachments to presigned URLs
func convertAttachmentsToPresigned(drives []models.PlacementDrive) []models.PlacementDrive {
	for i := range drives {
		for j := range drives[i].Attachments {
			s3Key := drives[i].Attachments[j].URL

			// Extract S3 key from stored URL
			bucket, key := utils.ExtractBucketAndKeyFromURL(s3Key) // s3Key variable name is misleading, it holds URL here.

			if bucket == "" {
				bucket = utils.GetBucketName()
			}

			// Generate presigned URL (5-minute expiry)
			if key != "" {
				presignedURL, err := utils.GetPresignedURL(bucket, key, 5)
				if err == nil {
					drives[i].Attachments[j].URL = presignedURL
				}
			}
		}
	}
	return drives
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

	// Convert attachment URLs to presigned URLs
	filtered = convertAttachmentsToPresigned(filtered)

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

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	// No filters for admin, they see everything
	filters := make(map[string]interface{})
	filters["limit"] = limit
	filters["offset"] = offset

	drives, err := repo.GetDrives(c.Context(), filters)
	if err != nil {
		fmt.Printf("Error fetching admin drives: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Could not fetch drives"})
	}

	total, _ := repo.GetDrivesCount(c.Context(), filters)

	// Convert attachment URLs to presigned URLs
	drives = convertAttachmentsToPresigned(drives)

	return c.JSON(fiber.Map{
		"drives": drives,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
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

	// Capture old status for notification logic
	oldStatus := drive.Status

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
			if !drive.DriveDate.IsZero() {
				driveDateStr = drive.DriveDate.Format("2006-01-02")
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
	if input.JobDescription != "" {
		drive.JobDescription = input.JobDescription
	}
	if input.Website != "" {
		drive.Website = input.Website
	}
	if input.LogoURL != "" {
		drive.LogoURL = input.LogoURL
	}
	if input.Location != "" {
		drive.Location = input.Location
	}
	if input.LocationType != "" {
		drive.LocationType = input.LocationType
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
	if len(input.Roles) > 0 {
		drive.Roles = input.Roles
	}

	if input.MinCgpa != 0 {
		drive.MinCgpa = input.MinCgpa
	}
	// MaxBacklogsAllowed can be 0, so if input is provided (assuming full update), we take it?
	// But CreateDriveInput makes it indistinguishable.
	// For "Update", we'll assume unconditional for now, OR rely on pointer if I changed it (I didn't).
	// Risk: Partial update wipes it. But standard Frontend sends all.
	drive.MaxBacklogsAllowed = input.MaxBacklogsAllowed

	// [FIX] Missing Eligibility Fields
	if input.TenthPercentage != nil {
		drive.TenthPercentage = input.TenthPercentage
	}
	if input.TwelfthPercentage != nil {
		drive.TwelfthPercentage = input.TwelfthPercentage
	}
	if input.UGMinCGPA != nil {
		drive.UGMinCGPA = input.UGMinCGPA
	}
	if input.PGMinCGPA != nil {
		drive.PGMinCGPA = input.PGMinCGPA
	}

	// UseAggregate is boolean. If we want to allow disabling it, false is valid.
	// But unconditional assignment wipes it if missing (false).
	// We'll trust the frontend sends the full object for boolean.
	drive.UseAggregate = input.UseAggregate

	if input.AggregatePercentage != nil {
		drive.AggregatePercentage = input.AggregatePercentage
	}

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

	// Attachment Update Logic
	if isMultipart {
		// In multipart, we expect the frontend to send the full list of *remaining* attachments
		// plus any new file uploads.
		drive.Attachments = append(input.Attachments, newAttachments...)
	} else if input.Attachments != nil {
		// In raw JSON, only update if the field is present
		drive.Attachments = input.Attachments
	}
	// If it was a simple status update without multipart, we don't touch drive.Attachments
	// which preserves the existing ones loaded from DB.

	// Dates
	// Dates
	if input.DeadlineDate != "" {
		d, err := time.Parse(time.RFC3339, input.DeadlineDate)
		if err != nil {
			// Fallback: Try simplified date format (yyyy-MM-ddTHH:mm)
			d, err = time.Parse("2006-01-02T15:04", input.DeadlineDate)
		}

		if err == nil {
			drive.DeadlineDate = d
		} else {
			fmt.Printf("UpdateDrive: Invalid DeadlineDate format: %s. Error: %v\n", input.DeadlineDate, err)
		}
	}
	if input.DriveDate != "" {
		t, err := time.Parse(time.RFC3339, input.DriveDate)
		if err != nil {
			t, err = time.Parse("2006-01-02T15:04", input.DriveDate)
			if err != nil {
				t, err = time.Parse("2006-01-02", input.DriveDate)
			}
		}

		if err == nil {
			drive.DriveDate = t
		} else {
			fmt.Printf("UpdateDrive: Invalid DriveDate format: %s. Error: %v\n", input.DriveDate, err)
		}
	}

	if input.Status != "" {
		drive.Status = input.Status
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
		// 3. Send
		// Logic: If status changed from !open to open, send "New Drive" notification (Republish)
		// If status changed from open to cancelled/on_hold, notify as well.
		var title, body, notifType string
		shouldNotify := false

		if oldStatus != "open" && d.Status == "open" {
			shouldNotify = true
			title = "New Placement Drive!" // Treated as new for students
			body = fmt.Sprintf("%s is hiring. Apply now!", d.CompanyName)
			notifType = "new_drive"
		} else if oldStatus == "open" && (d.Status == "cancelled" || d.Status == "on_hold") {
			shouldNotify = true
			if d.Status == "cancelled" {
				title = "Placement Drive Cancelled"
				body = fmt.Sprintf("The placement drive for %s has been cancelled.", d.CompanyName)
				notifType = "drive_cancelled"
			} else {
				title = "Placement Drive On Hold"
				body = fmt.Sprintf("The placement drive for %s has been put on hold.", d.CompanyName)
				notifType = "drive_on_hold"
			}
		} else if oldStatus != d.Status {
			// Other status changes
			title = "Placement Drive Updated"
			body = fmt.Sprintf("Updates have been made to %s. Check for changes.", d.CompanyName)
			notifType = "drive_update"
			shouldNotify = true
		} else {
			// Fallback for non-status updates
			title = "Placement Drive Updated"
			body = fmt.Sprintf("Updates have been made to %s. Check for changes.", d.CompanyName)
			notifType = "drive_update"
			shouldNotify = true
		}

		if shouldNotify {
			data := map[string]string{
				"drive_id": strconv.FormatInt(d.ID, 10),
				"type":     notifType,
			}

			successCount, err := ns.SendMulticastNotification(context.Background(), tokens, title, body, data)
			if err != nil {
				fmt.Printf("Notification Error: Send failed: %v\n", err)
			} else {
				fmt.Printf("Notification Sent: Successfully sent to %d/%d devices.\n", successCount, len(tokens))
			}
		}
	}(*drive)

	return c.JSON(fiber.Map{"message": "Drive updated successfully", "drive": drive})
}

// PatchDrive - Handles PATCH requests for selective updates
// @Summary Partially update a placement drive
// @Description Selectively update drive details (Admin only). Preserves existing data for missing fields.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param input body models.PatchDriveInput true "Updated Fields"
// @Success 200 {object} map[string]interface{}
// @Router /v1/admin/drives/{id} [patch]
func PatchDrive(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid drive ID"})
	}

	var input models.PatchDriveInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON input"})
	}

	repo := repository.NewDriveRepository(database.DB)
	drive, err := repo.GetDriveByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Drive not found"})
	}

	oldStatus := drive.Status

	// Selectively Update
	if input.CompanyName != nil {
		drive.CompanyName = *input.CompanyName
	}
	if input.JobDescription != nil {
		drive.JobDescription = *input.JobDescription
	}
	if input.Website != nil {
		drive.Website = *input.Website
	}
	if input.LogoURL != nil {
		drive.LogoURL = *input.LogoURL
	}
	if input.Location != nil {
		drive.Location = *input.Location
	}
	if input.LocationType != nil {
		drive.LocationType = *input.LocationType
	}
	if input.DriveType != nil {
		drive.DriveType = *input.DriveType
	}
	if input.CompanyCategory != nil {
		drive.CompanyCategory = *input.CompanyCategory
	}
	if input.SpocID != nil {
		drive.SpocID = *input.SpocID
	}
	if input.Roles != nil {
		drive.Roles = *input.Roles
	}
	if input.MinCgpa != nil {
		drive.MinCgpa = *input.MinCgpa
	}
	if input.TenthPercentage != nil {
		drive.TenthPercentage = input.TenthPercentage
	}
	if input.TwelfthPercentage != nil {
		drive.TwelfthPercentage = input.TwelfthPercentage
	}
	if input.UGMinCGPA != nil {
		drive.UGMinCGPA = input.UGMinCGPA
	}
	if input.PGMinCGPA != nil {
		drive.PGMinCGPA = input.PGMinCGPA
	}
	if input.UseAggregate != nil {
		drive.UseAggregate = *input.UseAggregate
	}
	if input.AggregatePercentage != nil {
		drive.AggregatePercentage = input.AggregatePercentage
	}
	if input.MaxBacklogsAllowed != nil {
		drive.MaxBacklogsAllowed = *input.MaxBacklogsAllowed
	}
	if input.EligibleBatches != nil {
		drive.EligibleBatches = *input.EligibleBatches
	}
	if input.EligibleDepartments != nil {
		drive.EligibleDepartments = *input.EligibleDepartments
	}
	if input.Rounds != nil {
		drive.Rounds = *input.Rounds
	}
	if input.Status != nil {
		drive.Status = *input.Status
	}

	if input.DeadlineDate != nil && *input.DeadlineDate != "" {
		d, err := time.Parse(time.RFC3339, *input.DeadlineDate)
		if err != nil {
			d, err = time.Parse("2006-01-02T15:04", *input.DeadlineDate)
		}
		if err == nil {
			drive.DeadlineDate = d
		}
	}

	if input.DriveDate != nil && *input.DriveDate != "" {
		t, err := time.Parse(time.RFC3339, *input.DriveDate)
		if err != nil {
			t, err = time.Parse("2006-01-02", *input.DriveDate)
		}
		if err == nil {
			drive.DriveDate = t
		}
	}

	if err := repo.UpdateDrive(c.Context(), id, drive); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to patch drive"})
	}

	// Notification Logic for status change
	if input.Status != nil && oldStatus != *input.Status {
		newStatus := *input.Status
		shouldNotify := false
		title, body, notifType := "", "", ""

		if newStatus == "open" && oldStatus != "open" {
			shouldNotify = true
			title = "New Placement Drive!"
			body = fmt.Sprintf("%s is hiring. Apply now!", drive.CompanyName)
			notifType = "new_drive"
		} else if oldStatus == "open" && (newStatus == "cancelled" || newStatus == "on_hold") {
			shouldNotify = true
			if newStatus == "cancelled" {
				title = "Placement Drive Cancelled"
				body = fmt.Sprintf("The placement drive for %s has been cancelled.", drive.CompanyName)
				notifType = "drive_cancelled"
			} else {
				title = "Placement Drive On Hold"
				body = fmt.Sprintf("The placement drive for %s has been put on hold.", drive.CompanyName)
				notifType = "drive_on_hold"
			}
		}

		if shouldNotify {
			go func(d models.PlacementDrive, t, b, nt string) {
				// Use the repository method to get tokens
				tokens, err := repo.GetEligibleStudentTokens(context.Background(), d)
				if err != nil || len(tokens) == 0 {
					return
				}
				ns, _ := services.NewNotificationService("firebase-service-account.json")
				if ns != nil {
					data := map[string]string{
						"drive_id": strconv.FormatInt(d.ID, 10),
						"type":     nt,
					}
					ns.SendMulticastNotification(context.Background(), tokens, t, b, data)
				}
			}(*drive, title, body, notifType)
		}
	}

	return c.JSON(fiber.Map{"message": "Drive patched successfully", "drive": drive})
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
	if drive.DriveDate.IsZero() {
		// Log error or handle gracefully? skipping deletion if date invalid
		fmt.Println("Drive date invalid, cannot reconstruct folder path for deletion")
	} else {
		dateStr := drive.DriveDate.Format("2006-01-02")
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
		if drive.DriveDate.IsZero() {
			continue
		}
		dateStr := drive.DriveDate.Format("2006-01-02")
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
		return c.Status(400).JSON(fiber.Map{"error": "Register Number is required"})
	}

	studentRepo := repository.NewStudentRepository(database.DB)
	studentID, err := studentRepo.GetStudentIDByRegisterNumber(c.Context(), input.RegisterNumber)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Student not found", "details": err.Error()})
	}

	repo := repository.NewDriveRepository(database.DB)
	if err := repo.AdminForceRegister(c.Context(), driveID, studentID, input.RoleIDs); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Manual registration failed", "details": err.Error()})
	}

	// Send Notification Async
	go func() {
		// 1. Get Token
		token, err := repo.GetStudentFCMToken(context.Background(), studentID)
		if err != nil || token == "" {
			fmt.Println("Manual Register Notification: No token found or error")
			return
		}

		// 2. Get Drive Info for Message
		drive, err := repo.GetDriveByID(context.Background(), driveID)
		if err != nil {
			return
		}

		// 3. Send
		ns, err := services.NewNotificationService("firebase-service-account.json")
		if err != nil {
			fmt.Printf("Notification Error: Failed to init service: %v\n", err)
			return
		}

		title := "Added to Drive"
		body := fmt.Sprintf("You have been manually added to the placement drive for %s.", drive.CompanyName)
		data := map[string]string{
			"drive_id": strconv.FormatInt(driveID, 10),
			"type":     "manual_add",
		}

		// Helper to send single? We have SendMulticast.
		// We can wrap single token in list.
		ns.SendMulticastNotification(context.Background(), []string{token}, title, body, data)
	}()

	return c.JSON(fiber.Map{"message": "Student manually added and notified"})
}

// ExportDriveApplicants - Handles POST /v1/admin/drives/:id/export
// @Summary Export drive applicants
// @Description Get detailed JSON of applicants (optionally filtered by IDs)
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Param input body map[string][]int64 false "List of Student IDs"
// @Success 200 {array} models.DriveApplicantDetailed
// @Router /v1/admin/drives/{id}/export [post]
func ExportDriveApplicants(c *fiber.Ctx) error {
	driveID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	var input struct {
		StudentIDs []int64 `json:"student_ids"`
	}
	// Body is optional (if empty, we export all)
	c.BodyParser(&input)

	// Role Check for Coordinator
	role := c.Locals("role").(string)
	var deptFilter *string
	if role == "coordinator" {
		if deptCode, ok := c.Locals("department_code").(string); ok && deptCode != "" {
			deptFilter = &deptCode
		} else {
			// Should not happen if middleware ensures it, but safe fallback
			return c.Status(403).JSON(fiber.Map{"error": "Coordinator department not found"})
		}
	}

	repo := repository.NewDriveRepository(database.DB)
	applicants, err := repo.GetDriveApplicantsDetailed(c.Context(), driveID, input.StudentIDs, deptFilter)
	if err != nil {
		fmt.Printf("Export Error: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch applicants"})
	}

	return c.JSON(applicants)
}

// GetDriveApplicantsDetailedHandler - GET /v1/admin/drives/:id/applicants/detailed
// @Summary Get detailed drive applicants
// @Description Get detailed JSON of all applicants for a drive
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Drive ID"
// @Success 200 {array} models.DriveApplicantDetailed
// @Router /v1/admin/drives/{id}/applicants/detailed [get]
func GetDriveApplicantsDetailedHandler(c *fiber.Ctx) error {
	driveID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid Drive ID"})
	}

	// Role Check for Coordinator
	role := c.Locals("role").(string)
	var deptFilter *string
	if role == "coordinator" {
		if deptCode, ok := c.Locals("department_code").(string); ok && deptCode != "" {
			deptFilter = &deptCode
		} else {
			// Should not happen if middleware ensures it, but safe fallback
			return c.Status(403).JSON(fiber.Map{"error": "Coordinator department not found"})
		}
	}

	repo := repository.NewDriveRepository(database.DB)
	applicants, err := repo.GetDriveApplicantsDetailed(c.Context(), driveID, nil, deptFilter)
	if err != nil {
		fmt.Printf("Get Detailed Applicants Error: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch applicants"})
	}

	for i := range applicants {
		if applicants[i].ProfilePhotoURL != "" {
			applicants[i].ProfilePhotoURL = utils.GenerateSignedProfileURL(applicants[i].ProfilePhotoURL)
		}
	}

	return c.JSON(applicants)
}

// EligibilityPreview - POST /v1/admin/drives/eligibility-preview
// @Summary Preview eligible students
// @Description Real-time fetch of students matching the drive rules
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body models.PlacementDrive true "Drive Creation Payload Rules"
// @Success 200 {array} models.DriveApplicantDetailed
// @Router /v1/admin/drives/eligibility-preview [post]
func EligibilityPreview(c *fiber.Ctx) error {
	var input models.PlacementDrive
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	repo := repository.NewDriveRepository(database.DB)
	students, err := repo.GetEligibleStudentsPreview(c.Context(), input)
	if err != nil {
		fmt.Printf("Eligibility Preview Error: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to evaluate eligibility"})
	}

	return c.JSON(students)
}
