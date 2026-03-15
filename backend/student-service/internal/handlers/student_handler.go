package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
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
		services.InvalidateCache(c.Context(), fmt.Sprintf("student:profile:%d", userID))
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

	// Merge input with current profile to preserve fields not in the request.
	// The Flutter app sends only the section being edited (e.g., just mobile_number
	// for "Contact Details"). Without merging, all other fields would be overwritten
	// with zero values, causing data loss across unrelated sections.
	if input.MobileNumber == "" {
		input.MobileNumber = currentProfile.MobileNumber
	}
	if input.Dob == "" {
		input.Dob = currentProfile.Dob
	}
	if input.Gender == "" {
		input.Gender = currentProfile.Gender
	}
	if input.AddressLine1 == "" {
		input.AddressLine1 = currentProfile.AddressLine1
	}
	if input.AddressLine2 == "" {
		input.AddressLine2 = currentProfile.AddressLine2
	}
	if input.State == "" {
		input.State = currentProfile.State
	}
	if input.PlacementWillingness == "" {
		input.PlacementWillingness = currentProfile.PlacementWillingness
	}
	if input.SocialLinks == nil {
		input.SocialLinks = currentProfile.SocialLinks
	}
	if input.LanguageSkills == nil {
		input.LanguageSkills = currentProfile.LanguageSkills
	}
	if input.PanNumber == "" {
		input.PanNumber = currentProfile.PanNumber
	}
	if input.AadharNumber == "" {
		input.AadharNumber = currentProfile.AadharNumber
	}
	// Schooling
	if input.TenthMark == 0 {
		input.TenthMark = currentProfile.TenthMark
	}
	if input.TenthBoard == "" {
		input.TenthBoard = currentProfile.TenthBoard
	}
	if input.TenthYearPass == 0 {
		input.TenthYearPass = currentProfile.TenthYearPass
	}
	if input.TenthInstitution == "" {
		input.TenthInstitution = currentProfile.TenthInstitution
	}
	if input.TwelfthMark == 0 {
		input.TwelfthMark = currentProfile.TwelfthMark
	}
	if input.TwelfthBoard == "" {
		input.TwelfthBoard = currentProfile.TwelfthBoard
	}
	if input.TwelfthYearPass == 0 {
		input.TwelfthYearPass = currentProfile.TwelfthYearPass
	}
	if input.TwelfthInstitution == "" {
		input.TwelfthInstitution = currentProfile.TwelfthInstitution
	}
	if input.DiplomaMark == 0 {
		input.DiplomaMark = currentProfile.DiplomaMark
	}
	if input.DiplomaYearPass == 0 {
		input.DiplomaYearPass = currentProfile.DiplomaYearPass
	}
	if input.DiplomaInstitution == "" {
		input.DiplomaInstitution = currentProfile.DiplomaInstitution
	}
	if input.CurrentBacklogs == 0 {
		input.CurrentBacklogs = currentProfile.CurrentBacklogs
	}
	if input.HistoryBacklogs == 0 {
		input.HistoryBacklogs = currentProfile.HistoryBacklogs
	}
	if input.GapYears == 0 {
		input.GapYears = currentProfile.GapYears
	}
	if input.GapReason == "" {
		input.GapReason = currentProfile.GapReason
	}
	// Degrees
	if input.UgCgpa == 0 {
		input.UgCgpa = currentProfile.UgCgpa
	}
	if input.UgYearPass == 0 {
		input.UgYearPass = currentProfile.UgYearPass
	}
	if input.UgInstitution == "" {
		input.UgInstitution = currentProfile.UgInstitution
	}
	if input.PgCgpa == 0 {
		input.PgCgpa = currentProfile.PgCgpa
	}
	if input.PgYearPass == 0 {
		input.PgYearPass = currentProfile.PgYearPass
	}
	if input.PgInstitution == "" {
		input.PgInstitution = currentProfile.PgInstitution
	}
	// UG Semester GPAs
	if input.UgGpaS1 == 0 {
		input.UgGpaS1 = currentProfile.UgGpaS1
	}
	if input.UgGpaS2 == 0 {
		input.UgGpaS2 = currentProfile.UgGpaS2
	}
	if input.UgGpaS3 == 0 {
		input.UgGpaS3 = currentProfile.UgGpaS3
	}
	if input.UgGpaS4 == 0 {
		input.UgGpaS4 = currentProfile.UgGpaS4
	}
	if input.UgGpaS5 == 0 {
		input.UgGpaS5 = currentProfile.UgGpaS5
	}
	if input.UgGpaS6 == 0 {
		input.UgGpaS6 = currentProfile.UgGpaS6
	}
	if input.UgGpaS7 == 0 {
		input.UgGpaS7 = currentProfile.UgGpaS7
	}
	if input.UgGpaS8 == 0 {
		input.UgGpaS8 = currentProfile.UgGpaS8
	}
	if input.UgGpaS9 == 0 {
		input.UgGpaS9 = currentProfile.UgGpaS9
	}
	if input.UgGpaS10 == 0 {
		input.UgGpaS10 = currentProfile.UgGpaS10
	}
	// PG Semester GPAs
	if input.PgGpaS1 == 0 {
		input.PgGpaS1 = currentProfile.PgGpaS1
	}
	if input.PgGpaS2 == 0 {
		input.PgGpaS2 = currentProfile.PgGpaS2
	}
	if input.PgGpaS3 == 0 {
		input.PgGpaS3 = currentProfile.PgGpaS3
	}
	if input.PgGpaS4 == 0 {
		input.PgGpaS4 = currentProfile.PgGpaS4
	}
	if input.PgGpaS5 == 0 {
		input.PgGpaS5 = currentProfile.PgGpaS5
	}
	if input.PgGpaS6 == 0 {
		input.PgGpaS6 = currentProfile.PgGpaS6
	}
	if input.PgGpaS7 == 0 {
		input.PgGpaS7 = currentProfile.PgGpaS7
	}
	if input.PgGpaS8 == 0 {
		input.PgGpaS8 = currentProfile.PgGpaS8
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
		if cachedProfile.ResumeURL != "" {
			cachedProfile.ResumeURL = utils.GenerateSignedDocumentURL(cachedProfile.ResumeURL)
		}
		if cachedProfile.AadharCardURL != "" {
			cachedProfile.AadharCardURL = utils.GenerateSignedDocumentURL(cachedProfile.AadharCardURL)
		}
		if cachedProfile.PanCardURL != "" {
			cachedProfile.PanCardURL = utils.GenerateSignedDocumentURL(cachedProfile.PanCardURL)
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
	if profile.ResumeURL != "" {
		profile.ResumeURL = utils.GenerateSignedDocumentURL(profile.ResumeURL)
	}
	if profile.AadharCardURL != "" {
		profile.AadharCardURL = utils.GenerateSignedDocumentURL(profile.AadharCardURL)
	}
	if profile.PanCardURL != "" {
		profile.PanCardURL = utils.GenerateSignedDocumentURL(profile.PanCardURL)
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
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") || strings.Contains(errMsg, "unique constraint") {
			if strings.Contains(errMsg, "email") {
				return c.Status(409).JSON(fiber.Map{"error": "A student with this email already exists."})
			}
			if strings.Contains(errMsg, "register_number") {
				return c.Status(409).JSON(fiber.Map{"error": "A student with this register number already exists."})
			}
			return c.Status(409).JSON(fiber.Map{"error": "Student with this Email or Register Number already exists."})
		}
		if strings.Contains(errMsg, "foreign key") || strings.Contains(errMsg, "violates foreign key") {
			if strings.Contains(errMsg, "department") {
				return c.Status(400).JSON(fiber.Map{"error": "Invalid department code. Please select a valid department."})
			}
			return c.Status(400).JSON(fiber.Map{"error": "Invalid reference data. Please check department and batch values."})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create student.", "details": errMsg})
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
	documentType := c.Params("type")

	validTypes := map[string]string{"resume": "resume_url", "profile_photo": "profile_photo_url", "aadhar": "aadhar_card_url", "pan": "pan_card_url"}
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
	case "aadhar_card_url":
		documentURL = profile.AadharCardURL
	case "pan_card_url":
		documentURL = profile.PanCardURL
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

	publicURL, err := utils.GetBrowserAccessibleURL(bucket, key)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate document URL"})
	}
	return c.JSON(fiber.Map{"url": publicURL, "type": documentType})
}

func (h *StudentHandler) GetStudentDocumentURL(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" && role != "super_admin" && role != "coordinator" {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	studentID, err := c.ParamsInt("student_id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid student ID"})
	}

	documentType := c.Params("type")
	validTypes := map[string]string{"resume": "resume_url", "profile_photo": "profile_photo_url", "aadhar": "aadhar_card_url", "pan": "pan_card_url"}
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
	case "aadhar_card_url":
		documentURL = profile.AadharCardURL
	case "pan_card_url":
		documentURL = profile.PanCardURL
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

	publicURL, err := utils.GetBrowserAccessibleURL(bucket, key)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate document URL"})
	}
	return c.JSON(fiber.Map{"url": publicURL, "type": documentType, "student_id": studentID})
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

	// Invalidate cached profile so next fetch gets the new URL
	services.InvalidateCache(c.Context(), fmt.Sprintf("student:profile:%d", userID))

	// For profile_pic, return a signed URL so the client can display it immediately
	resultURL := url
	if docType == "profile_pic" {
		resultURL = utils.GenerateSignedProfileURL(url)
	}

	return c.JSON(fiber.Map{"message": "Upload successful", "register_number": registerNumber, "type": docType, "url": resultURL})
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

// StreamMyProfilePhoto securely serves the authenticated user's profile photo.
// Only the user who owns the photo can access it via this endpoint.
func (h *StudentHandler) StreamMyProfilePhoto(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	if user.ProfilePhotoURL == nil || *user.ProfilePhotoURL == "" {
		return c.Status(404).JSON(fiber.Map{"error": "No profile photo uploaded"})
	}

	bucket, key := utils.ExtractBucketAndKeyFromURL(*user.ProfilePhotoURL)
	if bucket == "" || key == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Invalid photo path"})
	}

	// Clean query params from key
	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	client := utils.GetS3Client()
	result, err := client.GetObject(c.Context(), &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Profile photo not found in storage"})
	}
	defer result.Body.Close()

	if result.ContentType != nil {
		c.Set("Content-Type", *result.ContentType)
	} else {
		c.Set("Content-Type", "image/jpeg")
	}
	c.Set("Cache-Control", "private, max-age=3600")

	body, err := io.ReadAll(result.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read photo"})
	}

	return c.Send(body)
}

// StreamMyDocument securely serves the authenticated user's own document (resume or profile_photo).
func (h *StudentHandler) StreamMyDocument(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	documentType := c.Params("type")

	validTypes := map[string]string{"resume": "resume_url", "profile_photo": "profile_photo_url"}
	dbField, valid := validTypes[documentType]
	if !valid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid document type. Use 'resume' or 'profile_photo'"})
	}

	profile, err := h.studentRepo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User profile not found"})
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
	if bucket == "" || key == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Invalid document path"})
	}

	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	client := utils.GetS3Client()
	result, err := client.GetObject(c.Context(), &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Document not found in storage"})
	}
	defer result.Body.Close()

	if documentType == "resume" {
		c.Set("Content-Type", "application/pdf")
	} else if result.ContentType != nil && *result.ContentType != "application/octet-stream" {
		c.Set("Content-Type", *result.ContentType)
	} else {
		c.Set("Content-Type", "image/jpeg")
	}
	c.Set("Content-Disposition", "inline")
	c.Set("Cache-Control", "private, max-age=3600")

	body, err := io.ReadAll(result.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read document"})
	}

	return c.Send(body)
}

// StreamStudentDocument streams a student's document (profile_photo or resume) for admin/coordinator/super_admin.
func (h *StudentHandler) StreamStudentDocument(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" && role != "super_admin" && role != "coordinator" {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	studentID, err := c.ParamsInt("student_id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid student ID"})
	}

	documentType := c.Params("type")
	validTypes := map[string]string{"resume": "resume_url", "profile_photo": "profile_photo_url"}
	dbField, valid := validTypes[documentType]
	if !valid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid document type. Use 'resume' or 'profile_photo'"})
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
	if bucket == "" || key == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Invalid document path"})
	}

	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	client := utils.GetS3Client()
	result, err := client.GetObject(c.Context(), &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Document not found in storage"})
	}
	defer result.Body.Close()

	// Force correct content type for known document types
	if documentType == "resume" {
		c.Set("Content-Type", "application/pdf")
	} else if result.ContentType != nil && *result.ContentType != "application/octet-stream" {
		c.Set("Content-Type", *result.ContentType)
	} else {
		c.Set("Content-Type", "image/jpeg")
	}
	c.Set("Content-Disposition", "inline")
	c.Set("Cache-Control", "private, max-age=3600")

	body, err := io.ReadAll(result.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read document"})
	}

	return c.Send(body)
}
