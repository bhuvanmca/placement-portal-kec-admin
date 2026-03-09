package handlers

import (
	"fmt"
	"strings"

	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/placement-portal-kec/admin-service/internal/utils"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
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

	// 3. Validation
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

	// 4. Check Permissions and Create Change Requests
	// 3. Fetch Current Profile for comparison & permissions
	repo := repository.NewStudentRepository(database.DB)
	currentProfile, err := repo.GetStudentFullProfile(c.Context(), userID)

	// 3.1 Check if this is first-time onboarding (no existing profile data)
	// If sensitive fields are missing, treat as onboarding to allow filling them without approval
	isFirstOnboarding := false
	// Check if Personal Info is missing
	missingPersonal := currentProfile.MobileNumber == "" || currentProfile.Dob == ""
	// Check if Academic Info is missing (using 10th mark as proxy)
	missingAcademic := currentProfile.TenthMark == 0

	if err != nil || missingPersonal || missingAcademic {
		isFirstOnboarding = true
	}

	// 3.2 For first-time onboarding, skip permission checks and update directly
	if isFirstOnboarding {
		if err := repo.UpdateStudentProfile(c.Context(), userID, input); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create profile", "details": err.Error()})
		}
		return c.JSON(fiber.Map{"message": "Profile created successfully"})
	}

	// Profile exists - check for errors from fetch
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch current profile", "details": err.Error()})
	}

	permRepo := repository.NewPermissionRepository(database.DB)

	// Helper to check and create request
	// logic: if changed AND permission denied -> create req, revert input
	checkAndRevert := func(fieldName string, newVal interface{}, currentVal interface{}, revertFunc func()) error {
		// Simple equality check (convert to string for safety)
		sNew := fmt.Sprintf("%v", newVal)
		sCur := fmt.Sprintf("%v", currentVal)

		if sNew != sCur && sNew != "" && sNew != "0" { // Only check if changing and not empty/zero (assuming empty means no change in some contexts, but here we treat explicit values)
			// Actually, input string "" means no change for Personal fields in Update logic, but for Schooling it overwrites.
			// To be safe, let's treat any difference as a change attempt.

			// For string fields, input "" might validly mean "no change" based on Repository logic (COALESCE).
			if sNew == "" {
				return nil
			}
			if sNew == "0" && sCur == "0" {
				return nil
			} // Ignore 0 to 0

			allowed, err := permRepo.GetPermission(fieldName)
			if err != nil {
				return err
			}

			if !allowed {
				// Create Request
				req := models.StudentChangeRequest{
					StudentID: userID,
					FieldName: fieldName,
					OldValue:  sCur,
					NewValue:  sNew,
				}
				if err := permRepo.CreateChangeRequest(req); err != nil {
					return err
				}
				// Revert input to prevent direct update
				revertFunc()
			}
		}
		return nil
	}

	// Check Fields
	// Mobile
	if err := checkAndRevert("mobile_number", input.MobileNumber, currentProfile.MobileNumber, func() { input.MobileNumber = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Permission check failed"})
	}
	// DOB
	if err := checkAndRevert("dob", input.Dob, currentProfile.Dob, func() { input.Dob = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Permission check failed"})
	}
	// Gender
	if err := checkAndRevert("gender", input.Gender, currentProfile.Gender, func() { input.Gender = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Permission check failed"})
	}
	// Address
	// Combine address lines for simplicity or check individually?
	// Let's check individually if schema has them separate. Yes.
	// field_permissions table has keys. I inserted 'address' as one key?
	// Schema says: ('address', 'Address', TRUE, 'Personal').
	// But actual columns are address_line_1, address_line_2, state.
	// I should probably map all 3 to 'address' permission or have separate permissions.
	// For now, let's assume 'address' permission covers all address fields.

	addressAllowed, _ := permRepo.GetPermission("address")
	if !addressAllowed {
		// Check if any address field changed
		if input.AddressLine1 != "" && input.AddressLine1 != currentProfile.AddressLine1 {
			permRepo.CreateChangeRequest(models.StudentChangeRequest{StudentID: userID, FieldName: "address_line_1", OldValue: currentProfile.AddressLine1, NewValue: input.AddressLine1})
			input.AddressLine1 = "" // Revert
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

	// Marks
	// Tenth
	if err := checkAndRevert("tenth_mark", input.TenthMark, currentProfile.TenthMark, func() { input.TenthMark = currentProfile.TenthMark }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}

	// Twelfth
	if err := checkAndRevert("twelfth_mark", input.TwelfthMark, currentProfile.TwelfthMark, func() { input.TwelfthMark = currentProfile.TwelfthMark }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}

	// UG CGPA
	if err := checkAndRevert("ug_cgpa", input.UgCgpa, currentProfile.UgCgpa, func() { input.UgCgpa = currentProfile.UgCgpa }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}

	// PG CGPA
	if err := checkAndRevert("pg_cgpa", input.PgCgpa, currentProfile.PgCgpa, func() { input.PgCgpa = currentProfile.PgCgpa }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}

	// Placement Willingness
	if err := checkAndRevert("placement_willingness", input.PlacementWillingness, currentProfile.PlacementWillingness, func() { input.PlacementWillingness = "" }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error checking permissions"})
	}

	// 5. Call Repository with (possibly reverted) input
	if err := repo.UpdateStudentProfile(c.Context(), userID, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Profile updated successfully. Some changes may require approval."})
}

// UpdateFCMToken updates the student's FCM token
// @Summary Update FCM Token
// @Description Update the Firebase Cloud Messaging token for push notifications
// @Tags Student
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param token body map[string]string true "FCM Token"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/user/fcm-token [post]
func UpdateFCMToken(c *fiber.Ctx) error {
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

	fmt.Printf("[UpdateFCMToken] User %d updating token: %s...\n", userID, input.Token[:10])

	repo := repository.NewUserRepository(database.DB)
	if err := repo.UpdateFCMToken(c.Context(), userID, input.Token); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update token", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "FCM Token updated successfully"})
}

// CreateStudent manually adds a new student
// @Summary Create Student
// @Description Admin manually adds a student to the system
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param student body models.CreateStudentInput true "Student Details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/students [post]
func CreateStudent(c *fiber.Ctx) error {
	var input models.CreateStudentInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}

	// Basic Validation
	if input.FullName == "" || input.Email == "" || input.RegisterNumber == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name, Email, and Register Number are required"})
	}

	// Enforce Uppercase Register Number
	input.RegisterNumber = strings.ToUpper(input.RegisterNumber)

	// Password Logic
	plainPassword := input.Password
	if plainPassword == "" {
		plainPassword = "Student@123" // Default password
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not process password"})
	}

	user := models.User{
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		Role:         "student",
		IsActive:     true,
	}

	repo := repository.NewStudentRepository(database.DB)
	if err := repo.CreateStudent(c.Context(), &user, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create student. RegNo or Email might already exist.", "details": err.Error()})
	}

	// Generate OTP for password setup
	otp := utils.GenerateOTP()

	// Save OTP to database
	userRepo := repository.NewUserRepository(database.DB)
	if err := userRepo.SaveOTP(c.Context(), input.Email, otp); err != nil {
		fmt.Printf("Failed to save OTP for %s: %v\n", input.Email, err)
		// Continue anyway - student was created successfully
	}

	// Send welcome email asynchronously
	go func() {
		if err := utils.SendWelcomeEmail(input.Email, input.FullName, otp); err != nil {
			fmt.Printf("Failed to send welcome email to %s: %v\n", input.Email, err)
		}
	}()

	return c.Status(201).JSON(fiber.Map{
		"message": "Student created successfully. A welcome email with password setup instructions has been sent.",
	})
}

// GetMyProfile fetches the logged-in student's full profile
// @Summary Get My Profile
// @Description Get full profile details of the logged-in student
// @Tags Student
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.StudentFullProfile
// @Failure 500 {object} map[string]interface{}
// @Router /v1/student/profile [get]
func GetMyProfile(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))
	repo := repository.NewStudentRepository(database.DB)

	profile, err := repo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		fmt.Printf("GetMyProfile Error for user %d: %v\n", userID, err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch profile", "details": err.Error()})
	}

	// Presign Profile Photo URL for direct access
	if profile.ProfilePhotoURL != "" {
		profile.ProfilePhotoURL = utils.GenerateSignedProfileURL(profile.ProfilePhotoURL)
	}

	return c.JSON(profile)
}

// ChangePassword allows the student to change their password
// @Summary Change Password
// @Description Change student password by providing old and new password
// @Tags Student
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body map[string]string true "Password Data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/student/password [put]
func ChangePassword(c *fiber.Ctx) error {
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

	repo := repository.NewUserRepository(database.DB)

	// 1. Verify Old Password
	currentHash, err := repo.GetPasswordHash(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user data"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(input.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Incorrect old password"})
	}

	// 2. Hash New Password
	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to process new password"})
	}

	// 3. Update Password
	if err := repo.UpdatePassword(c.Context(), userID, string(newHash)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}
