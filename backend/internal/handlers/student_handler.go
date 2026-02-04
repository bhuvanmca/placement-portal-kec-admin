package handlers

import (
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
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
func UpdateProfile(c *fiber.Ctx) error {
	// 1. Get User ID from Token
	userID := int64(c.Locals("user_id").(float64))

	// 2. Parse Input
	var input models.UpdateProfileInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}

	// 3. Validation (Optional but recommended)
	// 3. Validation (Optional but recommended)
	if input.UgCgpa > 10.0 || input.PgCgpa > 10.0 {
		return c.Status(400).JSON(fiber.Map{"error": "CGPA cannot be greater than 10.0"})
	}
	// Validate Semester GPAs
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

	// 4. Call Repository
	repo := repository.NewStudentRepository(database.DB)
	if err := repo.UpdateStudentProfile(c.Context(), userID, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
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

	return c.Status(201).JSON(fiber.Map{
		"message":          "Student created successfully",
		"default_password": plainPassword, // Return so admin knows what it is (optional security risk but helpful for manual add)
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
