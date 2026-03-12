package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/placement-portal-kec/admin-service/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

type AdminAuthHandler struct {
	repo *repository.UserRepository
}

func NewAdminAuthHandler(db *pgxpool.Pool) *AdminAuthHandler {
	return &AdminAuthHandler{
		repo: repository.NewUserRepository(db),
	}
}

// AdminForgotPassword handles password reset request for admin/coordinator/super_admin
func (h *AdminAuthHandler) AdminForgotPassword(c *fiber.Ctx) error {
	var input struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.Email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email is required"})
	}

	user, err := h.repo.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		// Don't reveal whether user exists
		return c.JSON(fiber.Map{"message": "If the email exists, an OTP has been sent"})
	}

	// Only allow admin roles
	if user.Role != "admin" && user.Role != "coordinator" && user.Role != "super_admin" {
		return c.JSON(fiber.Map{"message": "If the email exists, an OTP has been sent"})
	}

	otp := utils.GenerateOTP()
	if err := h.repo.SaveOTP(c.Context(), input.Email, otp); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate OTP"})
	}

	go func() {
		if err := utils.SendOTPEmail(input.Email, otp); err != nil {
			fmt.Printf("Failed to send OTP email to %s: %v\n", input.Email, err)
		}
	}()

	return c.JSON(fiber.Map{"message": "If the email exists, an OTP has been sent"})
}

// AdminResetPassword handles password reset for admin/coordinator/super_admin
func (h *AdminAuthHandler) AdminResetPassword(c *fiber.Ctx) error {
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

	// Verify user is an admin role
	user, err := h.repo.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}
	if user.Role != "admin" && user.Role != "coordinator" && user.Role != "super_admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized"})
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

	// Update password and clear OTP
	if err := h.repo.ResetPassword(c.Context(), input.Email, string(hashedPassword)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	return c.JSON(fiber.Map{"message": "Password updated successfully. Please login."})
}
