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
	if err := repo.CreateUser(c.Context(), &user); err != nil {
		// Check for duplicate email error (Postgres error 23505)
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user, email might already exist"})
	}

	// 5. Success
	return c.Status(201).JSON(fiber.Map{
		"message": "User registered successfully",
		"user_id": user.ID,
	})
}

// LoginUser handles authentication
// @Summary Login user
// @Description Authenticate user and return JWT token
// @Tags Auth
// @Accept json
// @Produce json
// @Param credentials body models.LoginInput true "Login Credentials"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Router /auth/login [post]
func LoginUser(c *fiber.Ctx) error {
	var input models.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewUserRepository(database.DB)

	// 1. Find User
	user, err := repo.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// 2. Check Password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password))
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// 3. Security Checks
	if user.IsBlocked {
		return c.Status(403).JSON(fiber.Map{"error": "Your account has been blocked by Admin"})
	}

	// We do this in a "fire and forget" way (don't block login if this fails)
	// or block if you want strict auditing. Let's block to be safe.
	if err := repo.UpdateLastLogin(c.Context(), user.ID); err != nil {
		// Optional: log the error but allow login, or return 500.
		// For a student project, usually safe to ignore error or log it.
		fmt.Printf("Failed to update last_login: %v\n", err)
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate toekn"})
	}

	// 4. Success (In the next step, we will add JWT Token generation here)
	return c.JSON(fiber.Map{
		"message": "Login successful",
		"token":   token,
		"role":    user.Role,
		"email":   user.Email,
	})
}

// Generate Random 6-digit Code
func generateOTP() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%06d", r.Intn(1000000))
}

// 1. Forgot Password (Request OTP)
// @Summary Request Password Reset OTP
// @Description Sends an OTP to the user's email for password reset
// @Tags Auth
// @Accept json
// @Produce json
// @Param input body models.ForgotPasswordInput true "Email for OTP"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/forgot-password [post]
func ForgotPassword(c *fiber.Ctx) error {
	var input models.ForgotPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Email is required"})
	}

	// 1. Check if user exists (Optional: To prevent email enumeration, you might skip this, but for internal apps it's fine)
	repo := repository.NewUserRepository(database.DB)
	if _, err := repo.GetUserByEmail(c.Context(), input.Email); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	// 2. Generate & Save OTP
	otp := generateOTP()
	if err := repo.SaveOTP(c.Context(), input.Email, otp); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate OTP"})
	}

	// 3. Send Email
	// Run in Goroutine so API response is instant
	go func() {
		if err := utils.SendOTPEmail(input.Email, otp); err != nil {
			fmt.Printf("Failed to send email to %s: %v\n", input.Email, err)
		}
	}()

	return c.JSON(fiber.Map{"message": "OTP sent to your email"})
}

// 2. Reset Password (Verify OTP & Change)
// @Summary Reset Password
// @Description Verify OTP and set a new password
// @Tags Auth
// @Accept json
// @Produce json
// @Param input body models.ResetPasswordInput true "Reset Password Details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/reset-password [post]
func ResetPassword(c *fiber.Ctx) error {
	var input models.ResetPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewUserRepository(database.DB)

	// 1. Verify OTP
	isValid, err := repo.VerifyOTP(c.Context(), input.Email, input.Otp)
	if err != nil || !isValid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired OTP"})
	}

	// 2. Hash New Password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	// 3. Update Database
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
