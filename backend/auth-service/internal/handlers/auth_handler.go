package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"

	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/auth-service/internal/models"
	"github.com/placement-portal-kec/auth-service/internal/repository"
	"github.com/placement-portal-kec/auth-service/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	repo *repository.AuthRepository
}

func NewAuthHandler(repo *repository.AuthRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

// RegisterUser handles the sign-up process
func (h *AuthHandler) RegisterUser(c *fiber.Ctx) error {
	var input models.RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not process password"})
	}

	user, err := h.repo.CreateUser(c.Context(), &input, string(hashedPassword))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user, email might already exist", "details": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"message": "User registered successfully",
		"user_id": user.ID,
	})
}

// authenticateUser is an internal helper
func (h *AuthHandler) authenticateUser(c *fiber.Ctx, email, password string) (*models.User, error) {
	user, err := h.repo.GetUserByEmail(c.Context(), email)
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

	// Async update of last login
	go func() {
		_ = h.repo.UpdateLastLogin(context.Background(), user.ID)
	}()

	return user, nil
}

// Login handles universal authentication and returns JWT
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input models.LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	user, err := h.authenticateUser(c, input.Email, input.Password)
	if err != nil {
		if err.Error() == "your account has been blocked by Admin" {
			return c.Status(403).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	isProfileComplete := true
	if user.LastLogin == nil {
		isProfileComplete = false
	}

	// Fetch permissions for UI
	permissions, _ := h.repo.GetUserPermissions(c.Context(), user.ID)
	if permissions == nil {
		permissions = []string{}
	}

	response := fiber.Map{
		"message":             "Login successful",
		"token":               token,
		"id":                  user.ID,
		"role":                user.Role,
		"email":               user.Email,
		"permissions":         permissions,
		"is_profile_complete": isProfileComplete,
	}

	if user.Name != nil {
		response["name"] = *user.Name
	}
	if user.DepartmentCode != nil {
		response["department_code"] = *user.DepartmentCode
	}
	if user.ProfilePhotoURL != nil && *user.ProfilePhotoURL != "" {
		response["profile_photo_url"] = utils.GenerateSignedProfileURL(*user.ProfilePhotoURL)
	}

	return c.JSON(response)
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var input struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email is required"})
	}

	// Check if user exists
	_, err := h.repo.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		// Don't reveal whether user exists
		return c.JSON(fiber.Map{"message": "If the email exists, an OTP has been sent"})
	}

	// Generate 6-digit OTP using crypto/rand
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate OTP"})
	}
	otp := fmt.Sprintf("%06d", n.Int64())

	if err := h.repo.SaveOTP(c.Context(), input.Email, otp); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate OTP"})
	}

	// Send OTP email asynchronously
	go func() {
		if err := utils.SendOTPEmail(input.Email, otp); err != nil {
			log.Printf("[PASSWORD RESET] Failed to send OTP email to %s: %v", input.Email, err)
		}
	}()

	return c.JSON(fiber.Map{"message": "If the email exists, an OTP has been sent"})
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var input struct {
		Email       string `json:"email"`
		OTP         string `json:"otp"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Email == "" || input.OTP == "" || input.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email, OTP, and new password are required"})
	}

	if len(input.NewPassword) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 6 characters"})
	}

	// Verify OTP
	valid, err := h.repo.VerifyOTP(c.Context(), input.Email, input.OTP)
	if err != nil || !valid {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid or expired OTP"})
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not process password"})
	}

	// Update password
	if err := h.repo.ResetPassword(c.Context(), input.Email, string(hashedPassword)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	// Clean up OTP
	_ = h.repo.DeleteOTP(c.Context(), input.Email)

	return c.JSON(fiber.Map{"message": "Password reset successfully"})
}
