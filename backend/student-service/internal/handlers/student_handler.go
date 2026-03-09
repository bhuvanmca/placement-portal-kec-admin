package handlers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/student-service/internal/database"
	"github.com/placement-portal-kec/student-service/internal/models"
	"github.com/placement-portal-kec/student-service/internal/repository"
	"github.com/placement-portal-kec/student-service/internal/services"
	"github.com/placement-portal-kec/student-service/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

// StudentHandler encapsulates all student-related handlers
type StudentHandler struct {
	studentRepo *repository.StudentRepository
	userRepo    *repository.UserRepository
	requestRepo *repository.RequestRepository
}

func NewStudentHandler(studentRepo *repository.StudentRepository, userRepo *repository.UserRepository, requestRepo *repository.RequestRepository) *StudentHandler {
	return &StudentHandler{studentRepo: studentRepo, userRepo: userRepo, requestRepo: requestRepo}
}

// ---- Profile Handlers ----

func (h *StudentHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	var input models.UpdateProfileInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}

	if input.UgCgpa > 10.0 || input.PgCgpa > 10.0 {
		return c.Status(400).JSON(fiber.Map{"error": "CGPA cannot be greater than 10.0"})
	}
	gpas := []float64{
		input.UgGpaS1, input.UgGpaS2, input.UgGpaS3, input.UgGpaS4, input.UgGpaS5,
		input.UgGpaS6, input.UgGpaS7, input.UgGpaS8, input.UgGpaS9, input.UgGpaS10,
		input.PgGpaS1, input.PgGpaS2, input.PgGpaS3, input.PgGpaS4,
		input.PgGpaS5, input.PgGpaS6, input.PgGpaS7, input.PgGpaS8,
	}
	for _, gpa := range gpas {
		if gpa > 10.0 {
			return c.Status(400).JSON(fiber.Map{"error": "Semester GPA cannot be greater than 10.0"})
		}
	}

	currentProfile, err := h.studentRepo.GetStudentFullProfile(c.Context(), userID)

	isFirstOnboarding := false
	missingPersonal := currentProfile == nil || currentProfile.MobileNumber == "" || currentProfile.Dob == ""
	missingAcademic := currentProfile == nil || currentProfile.TenthMark == 0

	if err != nil || missingPersonal || missingAcademic {
		isFirstOnboarding = true
	}

	if isFirstOnboarding {
		if err := h.studentRepo.UpdateStudentProfile(c.Context(), userID, input); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create profile", "details": err.Error()})
		}
		return c.JSON(fiber.Map{"message": "Profile created successfully"})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch current profile", "details": err.Error()})
	}

	permRepo := repository.NewPermissionRepository(database.DB)

	checkAndRevert := func(fieldName string, newVal interface{}, currentVal interface{}, revertFunc func()) error {
		sNew := fmt.Sprintf("%v", newVal)
		sCur := fmt.Sprintf("%v", currentVal)
		if sNew == "" || sNew == "0" {
			return nil
		}
		if sNew != sCur {
			if sNew == "0" && sCur == "0" {
				return nil
			}
			allowed, err := permRepo.GetPermission(fieldName)
			if err != nil {
				return err
			}
			if !allowed {
				req := models.StudentChangeRequest{
					StudentID: userID, FieldName: fieldName, OldValue: sCur, NewValue: sNew,
				}
				if err := permRepo.CreateChangeRequest(req); err != nil {
					return err
				}
				revertFunc()
			}
		}
		return nil
	}

	if err := checkAndRevert("mobile_number", input.MobileNumber, currentProfile.MobileNumber, func() { input.MobileNumber = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Permission check failed"})
	}
	if err := checkAndRevert("dob", input.Dob, currentProfile.Dob, func() { input.Dob = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Permission check failed"})
	}
	if err := checkAndRevert("gender", input.Gender, currentProfile.Gender, func() { input.Gender = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Permission check failed"})
	}

	addressAllowed, _ := permRepo.GetPermission("address")
	if !addressAllowed {
		if input.AddressLine1 != "" && input.AddressLine1 != currentProfile.AddressLine1 {
			permRepo.CreateChangeRequest(models.StudentChangeRequest{StudentID: userID, FieldName: "address_line_1", OldValue: currentProfile.AddressLine1, NewValue: input.AddressLine1})
			input.AddressLine1 = ""
		}
		if input.AddressLine2 != "" && input.AddressLine2 != currentProfile.AddressLine2 {
			permRepo.CreateChangeRequest(models.StudentChangeRequest{StudentID: userID, FieldName: "address_line_2", OldValue: currentProfile.AddressLine2, NewValue: input.AddressLine2})
			input.AddressLine2 = ""
		}
		if input.State != "" && input.State != currentProfile.State {
			permRepo.CreateChangeRequest(models.StudentChangeRequest{StudentID: userID, FieldName: "state", OldValue: currentProfile.State, NewValue: input.State})
			input.State = ""
		}
	}

	if err := checkAndRevert("tenth_mark", input.TenthMark, currentProfile.TenthMark, func() { input.TenthMark = currentProfile.TenthMark }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}
	if err := checkAndRevert("twelfth_mark", input.TwelfthMark, currentProfile.TwelfthMark, func() { input.TwelfthMark = currentProfile.TwelfthMark }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}
	if err := checkAndRevert("ug_cgpa", input.UgCgpa, currentProfile.UgCgpa, func() { input.UgCgpa = currentProfile.UgCgpa }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}
	if err := checkAndRevert("pg_cgpa", input.PgCgpa, currentProfile.PgCgpa, func() { input.PgCgpa = currentProfile.PgCgpa }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}
	if err := checkAndRevert("placement_willingness", input.PlacementWillingness, currentProfile.PlacementWillingness, func() { input.PlacementWillingness = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}

	if err := h.studentRepo.UpdateStudentProfile(c.Context(), userID, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile", "details": err.Error()})
	}

	// Invalidate cached profile
	services.InvalidateCache(c.Context(), fmt.Sprintf("student:profile:%d", userID))

	return c.JSON(fiber.Map{"message": "Profile updated successfully. Some changes may require approval."})
}

func (h *StudentHandler) GetMyProfile(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	cacheKey := fmt.Sprintf("student:profile:%d", userID)

	// Try cache first
	var cachedProfile models.StudentFullProfile
	if services.GetCache(c.Context(), cacheKey, &cachedProfile) {
		if cachedProfile.ProfilePhotoURL != "" {
			cachedProfile.ProfilePhotoURL = utils.GenerateSignedProfileURL(cachedProfile.ProfilePhotoURL)
		}
		return c.JSON(cachedProfile)
	}

	// Cache miss — fetch from DB
	profile, err := h.studentRepo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch profile", "details": err.Error()})
	}

	// Cache for 5 minutes
	services.SetCache(c.Context(), cacheKey, profile, 5*time.Minute)

	if profile.ProfilePhotoURL != "" {
		profile.ProfilePhotoURL = utils.GenerateSignedProfileURL(profile.ProfilePhotoURL)
	}
	return c.JSON(profile)
}

func (h *StudentHandler) ChangePassword(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	var input struct {
		OldPassword     string `json:"old_password"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.NewPassword == "" || len(input.NewPassword) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "New password must be at least 6 characters long"})
	}
	if input.NewPassword != input.ConfirmPassword {
		return c.Status(400).JSON(fiber.Map{"error": "New passwords do not match"})
	}

	currentHash, err := h.userRepo.GetPasswordHash(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user data"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(input.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Incorrect old password"})
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to process new password"})
	}
	if err := h.userRepo.UpdatePassword(c.Context(), userID, string(newHash)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update password"})
	}
	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}

func (h *StudentHandler) UpdateFCMToken(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	var input struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.Token == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Token is required"})
	}
	if err := h.userRepo.UpdateFCMToken(c.Context(), userID, input.Token); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update token", "details": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "FCM Token updated successfully"})
}

func (h *StudentHandler) CreateStudent(c *fiber.Ctx) error {
	var input models.CreateStudentInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}
	if input.FullName == "" || input.Email == "" || input.RegisterNumber == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name, Email, and Register Number are required"})
	}
	input.RegisterNumber = strings.ToUpper(input.RegisterNumber)

	plainPassword := input.Password
	if plainPassword == "" {
		plainPassword = "Student@123"
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not process password"})
	}

	user := models.User{Email: input.Email, PasswordHash: string(hashedPassword), Role: "student", IsActive: true}
	if err := h.studentRepo.CreateStudent(c.Context(), &user, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create student.", "details": err.Error()})
	}

	otp := utils.GenerateOTP()
	if err := h.userRepo.SaveOTP(c.Context(), input.Email, otp); err != nil {
		fmt.Printf("Failed to save OTP for %s: %v\n", input.Email, err)
	}
	go func() {
		if err := utils.SendWelcomeEmail(input.Email, input.FullName, otp); err != nil {
			fmt.Printf("Failed to send welcome email to %s: %v\n", input.Email, err)
		}
	}()

	// Invalidate student list cache
	services.InvalidateCacheByPrefix(c.Context(), "students:list:")

	return c.Status(201).JSON(fiber.Map{"message": "Student created successfully."})
}

// ---- Document Handlers ----

func (h *StudentHandler) GetDocumentURL(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	role := c.Locals("role").(string)
	documentType := c.Params("type")

	validTypes := map[string]string{"resume": "resume_url", "aadhar": "aadhar_card_url", "pan": "pan_card_url", "profile_photo": "profile_photo_url"}
	dbField, valid := validTypes[documentType]
	if !valid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid document type"})
	}

	profile, err := h.studentRepo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch profile"})
	}

	var documentURL string
	switch dbField {
	case "resume_url":
		documentURL = profile.ResumeURL
	case "profile_photo_url":
		documentURL = profile.ProfilePhotoURL
	}
	if documentURL == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Document not uploaded yet"})
	}
	if role != "admin" && role != "student" {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized access"})
	}

	bucket, key := utils.ExtractBucketAndKeyFromURL(documentURL)
	if key == "" {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse document URL"})
	}
	if bucket == "" {
		bucket = utils.GetBucketName()
	}

	presignedURL, err := utils.GetPresignedURL(bucket, key, 5)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate secure URL"})
	}
	return c.JSON(fiber.Map{"url": presignedURL, "type": documentType, "expires_in": "5 minutes"})
}

func (h *StudentHandler) GetStudentDocumentURL(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" && role != "super_admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	studentID, err := c.ParamsInt("student_id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid student ID"})
	}

	documentType := c.Params("type")
	validTypes := map[string]string{"resume": "resume_url", "aadhar": "aadhar_card_url", "pan": "pan_card_url", "profile_photo": "profile_photo_url"}
	dbField, valid := validTypes[documentType]
	if !valid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid document type"})
	}

	profile, err := h.studentRepo.GetStudentFullProfile(c.Context(), int64(studentID))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).JSON(fiber.Map{"error": "Student not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch student profile"})
	}

	var documentURL string
	switch dbField {
	case "resume_url":
		documentURL = profile.ResumeURL
	case "profile_photo_url":
		documentURL = profile.ProfilePhotoURL
	}
	if documentURL == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Document not uploaded yet"})
	}

	bucket, key := utils.ExtractBucketAndKeyFromURL(documentURL)
	if key == "" {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse document URL"})
	}
	if bucket == "" {
		bucket = utils.GetBucketName()
	}

	presignedURL, err := utils.GetPresignedURL(bucket, key, 5)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate secure URL"})
	}
	return c.JSON(fiber.Map{"url": presignedURL, "type": documentType, "student_id": studentID, "expires_in": "5 minutes"})
}

// ---- Upload Handlers ----

func (h *StudentHandler) UploadDocument(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	docType := c.Query("type")

	validTypes := map[string]bool{"resume": true, "aadhar": true, "pan": true, "profile_pic": true}
	if !validTypes[docType] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid document type"})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}
	if fileHeader.Size > 1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File size exceeds 1MB limit"})
	}

	registerNumber, err := h.userRepo.GetRegisterNumber(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Profile incomplete: Register Number not found"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	path := fmt.Sprintf("students/%s/%s", registerNumber, docType)
	url, err := utils.UploadToS3(file, fileHeader, path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Upload failed", "details": err.Error()})
	}

	if err := h.userRepo.UpdateDocumentPath(c.Context(), userID, docType, url); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database update failed"})
	}

	return c.JSON(fiber.Map{"message": "Upload successful", "register_number": registerNumber, "type": docType, "url": url})
}

func (h *StudentHandler) UploadProfilePicture(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}
	if fileHeader.Size > 2*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File size exceeds 2MB limit"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user details"})
	}

	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".jpg"
	}

	var path string
	userName := "user"
	if user.Name != nil && *user.Name != "" {
		userName = utils.SanitizeFileName(*user.Name)
	}

	switch user.Role {
	case "super_admin":
		path = fmt.Sprintf("super_admin/%s/profile_pic%s", userName, ext)
	case "admin":
		path = fmt.Sprintf("admin/%s/profile_pic%s", userName, ext)
	case "coordinator":
		dept := "general"
		if user.DepartmentCode != nil {
			dept = *user.DepartmentCode
		}
		path = fmt.Sprintf("coordinators/%s_%s/profile_pic%s", userName, dept, ext)
	case "student":
		regNo, err := h.userRepo.GetRegisterNumber(c.Context(), userID)
		if err == nil && regNo != "" {
			path = fmt.Sprintf("students/%s/profile_pic%s", regNo, ext)
		} else {
			path = fmt.Sprintf("users/%d/profile_pic%s", userID, ext)
		}
	default:
		path = fmt.Sprintf("users/%d/profile_pic%s", userID, ext)
	}

	url, err := utils.UploadToS3(file, fileHeader, path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Upload failed", "details": err.Error()})
	}

	if err := h.userRepo.UpdateUserProfile(c.Context(), userID, *user.Name, url); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database update failed"})
	}

	// Invalidate cached profile
	services.InvalidateCache(c.Context(), fmt.Sprintf("student:profile:%d", userID))

	signedURL := utils.GenerateSignedProfileURL(url)

	logRepo := repository.NewActivityLogRepository(database.DB)
	details, _ := json.Marshal(map[string]interface{}{"path": path})
	_ = logRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID: userID, Action: "UPLOAD_PROFILE_PICTURE", EntityType: "USER",
		EntityID: strconv.FormatInt(userID, 10), Details: details, IPAddress: c.IP(),
	})

	return c.JSON(fiber.Map{"message": "Profile picture updated successfully", "url": signedURL, "path": path})
}

func (h *StudentHandler) UploadChatAttachment(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File is required"})
	}
	if fileHeader.Size > 10*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File size exceeds 10MB limit"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".bin"
	}

	randomName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), utils.GenerateRandomString(8), ext)
	groupID := c.FormValue("group_id")
	var path string
	if groupID != "" {
		now := time.Now()
		path = fmt.Sprintf("chat_groups/%s/%d/%02d/%s", groupID, now.Year(), now.Month(), randomName)
	} else {
		path = fmt.Sprintf("chat_attachments/%d/%s", userID, randomName)
	}

	chatBucket := os.Getenv("GARAGE_CHAT_BUCKET")
	var url string
	if chatBucket != "" {
		url, err = utils.UploadToS3Bucket(file, fileHeader, path, chatBucket)
	} else {
		url, err = utils.UploadToS3(file, fileHeader, path)
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Upload failed: %v", err)})
	}

	signedURL := utils.GenerateSignedProfileURL(url)
	return c.JSON(fiber.Map{
		"message": "Upload successful", "url": signedURL, "path": path,
		"name": fileHeader.Filename, "size": fileHeader.Size, "type": fileHeader.Header.Get("Content-Type"),
	})
}

// ---- Change Request Handlers ----

func (h *StudentHandler) CreateRequest(c *fiber.Ctx) error {
	var input struct {
		FieldName string  `json:"field_name"`
		NewValue  float64 `json:"new_value"`
		Reason    string  `json:"reason"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	userID := int64(c.Locals("user_id").(float64))
	student, err := h.studentRepo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Student not found"})
	}

	var oldValue float64
	switch input.FieldName {
	case "ug_cgpa":
		oldValue = student.UgCgpa
	case "pg_cgpa":
		oldValue = student.PgCgpa
	default:
		oldValue = 0.0
	}

	req := models.StudentChangeRequest{
		StudentID: userID, FieldName: input.FieldName,
		OldValue: fmt.Sprintf("%.2f", oldValue), NewValue: fmt.Sprintf("%.2f", input.NewValue),
		Reason: input.Reason, Status: "pending",
	}
	if err := h.requestRepo.CreateRequest(&req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
	}
	return c.Status(201).JSON(fiber.Map{"message": "Request submitted successfully"})
}

func (h *StudentHandler) GetMyRequests(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	requests, err := h.requestRepo.GetRequestsByStudentID(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch requests"})
	}
	return c.JSON(requests)
}

func (h *StudentHandler) DeleteMyRequest(c *fiber.Ctx) error {
	studentID := int64(c.Locals("user_id").(float64))
	requestID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request ID"})
	}
	if err := h.requestRepo.SoftDeleteStudentChangeRequest(c.Context(), studentID, requestID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to remove request"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Request removed from history"})
}

// ---- Admin Request Management ----

func (h *StudentHandler) GetPendingRequests(c *fiber.Ctx) error {
	reqs, err := h.requestRepo.GetPendingRequests()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch requests"})
	}
	return c.JSON(reqs)
}

func (h *StudentHandler) ReviewRequest(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	var input struct {
		Action          string `json:"action"`
		RejectionReason string `json:"rejection_reason"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	adminID := int64(c.Locals("user_id").(float64))

	switch input.Action {
	case "approve":
		req, err := h.requestRepo.GetRequestByID(id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}
		if err := h.requestRepo.UpdateRequestStatus(id, "approved", adminID, nil); err != nil {
			if len(err.Error()) > 8 && err.Error()[:8] == "CONFLICT" {
				return c.Status(409).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}
		if err := h.studentRepo.ApplyFieldUpdate(req.StudentID, req.FieldName, req.NewValue); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Request approved but failed to update student record."})
		}
	case "reject":
		if err := h.requestRepo.UpdateRequestStatus(id, "rejected", adminID, &input.RejectionReason); err != nil {
			if len(err.Error()) > 8 && err.Error()[:8] == "CONFLICT" {
				return c.Status(409).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}
	return c.JSON(fiber.Map{"message": "Request reviewed successfully"})
}
