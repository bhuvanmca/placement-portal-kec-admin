package handlers

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// RegisterUser handles the sign-up process
// @Summary Register a new user
// @Description Register a new user with email, password and role
// @Tags Auth
// @Accept json
// @Produce json
// @Param user body models.RegisterInput true "User Registration Details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/register [post]
func RegisterUser(c *fiber.Ctx) error {
	// 1. Parse Input
	var input models.RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}

	// 2. Hash Password (CRITICAL SECURITY STEP)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not process password"})
	}

	// 3. Prepare User Model
	user := models.User{
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		Role:         input.Role,
	}

	// 4. Save to Database
	repo := repository.NewUserRepository(database.DB)
	if err := repo.CreateUser(c.Context(), &user, input.FullName); err != nil {
		// Check for duplicate email error (Postgres error 23505)
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user, email might already exist", "details": err.Error()})
	}

	// 5. Success
	return c.Status(201).JSON(fiber.Map{
		"message": "User registered successfully",
		"user_id": user.ID,
	})
}

// LoginUser handles authentication
// @Summary Login user
// Helper for authentication
func authenticateUser(c *fiber.Ctx, email, password string) (*models.User, error) {
	repo := repository.NewUserRepository(database.DB)

	user, err := repo.GetUserByEmail(c.Context(), email)
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	if user.IsBlocked {
		return nil, fmt.Errorf("your account has been blocked by Admin")
	}

	if err := repo.UpdateLastLogin(c.Context(), user.ID); err != nil {
		fmt.Printf("Failed to update last_login: %v\n", err)
	}

	return user, nil
}

// AdminLogin handles admin authentication
// @Summary Admin Login
// @Description Authenticate admin user
// @Tags Admin Auth
// @Accept json
// @Produce json
// @Param credentials body models.LoginInput true "Login Credentials"
// @Router /v1/admin/auth/login [post]
func AdminLogin(c *fiber.Ctx) error {
	var input models.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	user, err := authenticateUser(c, input.Email, input.Password)
	if err != nil {
		if err.Error() == "your account has been blocked by Admin" {
			return c.Status(403).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized: Access restricted to administrators"})
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	return c.JSON(fiber.Map{
		"message": "Admin login successful",
		"token":   token,
		"role":    user.Role,
		"email":   user.Email,
	})
}

// StudentLogin handles student authentication
// @Summary Student Login
// @Description Authenticate student user
// @Tags Student Auth
// @Accept json
// @Produce json
// @Param credentials body models.LoginInput true "Login Credentials"
// @Router /v1/auth/login [post]
func StudentLogin(c *fiber.Ctx) error {
	var input models.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	user, err := authenticateUser(c, input.Email, input.Password)
	if err != nil {
		if err.Error() == "your account has been blocked by Admin" {
			return c.Status(403).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	// Strictly enforce student-only login
	if user.Role != "student" {
		return c.Status(403).JSON(fiber.Map{"error": "This portal is for students only"})
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	// Check if profile is complete (heuristic: mobile_number is not 'NA' and not empty)
	repo := repository.NewUserRepository(database.DB)
	isProfileComplete := repo.IsStudentProfileComplete(c.Context(), user.ID)

	return c.JSON(fiber.Map{
		"message":             "Login successful",
		"token":               token,
		"role":                user.Role,
		"email":               user.Email,
		"is_profile_complete": isProfileComplete,
	})
}

// Generate Random 6-digit Code
func generateOTP() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%06d", r.Intn(1000000))
}

// AdminForgotPassword handles password reset request for admins
func AdminForgotPassword(c *fiber.Ctx) error {
	var input models.ForgotPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Email is required"})
	}

	repo := repository.NewUserRepository(database.DB)
	user, err := repo.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized: This feature is for admins only"})
	}

	otp := generateOTP()
	if err := repo.SaveOTP(c.Context(), input.Email, otp); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate OTP"})
	}

	go func() {
		if err := utils.SendOTPEmail(input.Email, otp); err != nil {
			fmt.Printf("Failed to send email to %s: %v\n", input.Email, err)
		}
	}()

	return c.JSON(fiber.Map{"message": "OTP sent to your email"})
}

// AdminResetPassword handles password reset for admins
func AdminResetPassword(c *fiber.Ctx) error {
	var input models.ResetPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Additional Check: Verify user is admin before allowing reset?
	// VerifyOTP checks email/OTP match.
	// If the OTP was only issued to an admin (via AdminForgotPassword), it is safe.
	// But double checking role doesn't hurt if we want to be strict.

	repo := repository.NewUserRepository(database.DB)

	// Check user role first
	user, err := repo.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}
	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized"})
	}

	isValid, err := repo.VerifyOTP(c.Context(), input.Email, input.Otp)
	if err != nil || !isValid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired OTP"})
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	if err := repo.ResetPassword(c.Context(), input.Email, string(hashedPassword)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	return c.JSON(fiber.Map{"message": "Password updated successfully. Please login."})
}

// LogoutUser is mostly symbolic in a stateless JWT setup
// @Summary Logout user
// @Description Logout user (symbolic in JWT)
// @Tags Auth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /auth/logout [post]
func LogoutUser(c *fiber.Ctx) error {
	// If you were using Cookies, you would clear them here:
	// c.ClearCookie("jwt_token")

	return c.JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}
