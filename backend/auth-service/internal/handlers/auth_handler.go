package handlers

import (
	"context"
	"fmt"

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
		response["profile_photo_url"] = *user.ProfilePhotoURL
	}

	return c.JSON(response)
}
