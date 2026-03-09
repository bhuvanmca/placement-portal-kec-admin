package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type SystemSettingsHandler struct {
	Repo     *repository.SettingsRepository
	UserRepo *repository.UserRepository
	LogRepo  *repository.ActivityLogRepository
}

func NewSystemSettingsHandler(db *pgxpool.Pool) *SystemSettingsHandler {
	return &SystemSettingsHandler{
		Repo:     repository.NewSettingsRepository(db),
		UserRepo: repository.NewUserRepository(db),
		LogRepo:  repository.NewActivityLogRepository(db),
	}
}

// GetSettings handles GET /api/v1/settings
func (h *SystemSettingsHandler) GetSettings(c *fiber.Ctx) error {
	settings, err := h.Repo.GetSystemSettings(c.Context())
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	// Presign the College Logo URL if it exists
	if url, ok := settings["college_logo_url"]; ok && url != "" {
		settings["college_logo_url"] = utils.GenerateSignedProfileURL(url)
	}

	return c.JSON(fiber.Map{"settings": settings})
}

// UpdateSettings handles POST /api/v1/admin/settings
func (h *SystemSettingsHandler) UpdateSettings(c *fiber.Ctx) error {
	var body map[string]string
	if err := c.BodyParser(&body); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID := c.Locals("user_id").(float64)

	for key, value := range body {
		if err := h.Repo.UpdateSystemSetting(c.Context(), key, value, int64(userID)); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update setting: " + key})
		}
	}

	// Log Activity
	details, _ := json.Marshal(body)
	_ = h.LogRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     int64(userID),
		Action:     "UPDATE_SETTINGS",
		EntityType: "SETTINGS",
		EntityID:   "system",
		Details:    details,
		IPAddress:  c.IP(),
	})

	return c.JSON(fiber.Map{"message": "Settings updated successfully"})
}

// GetAccount handles GET /api/v1/user/account
func (h *SystemSettingsHandler) GetAccount(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	user, err := h.UserRepo.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch account details"})
	}

	// Presign Profile Photo URL
	if user.ProfilePhotoURL != nil && *user.ProfilePhotoURL != "" {
		signed := utils.GenerateSignedProfileURL(*user.ProfilePhotoURL)
		user.ProfilePhotoURL = &signed
	}

	return c.JSON(user)
}

// UpdateAccount handles PUT /api/v1/user/account
func (h *SystemSettingsHandler) UpdateAccount(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	var input struct {
		Name            string `json:"name"`
		ProfilePhotoURL string `json:"profile_photo_url"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := h.UserRepo.UpdateUserProfile(c.Context(), userID, input.Name, input.ProfilePhotoURL); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	// Log Activity
	details, _ := json.Marshal(map[string]interface{}{
		"name":                      input.Name,
		"profile_photo_url_updated": input.ProfilePhotoURL != "",
	})
	_ = h.LogRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     "UPDATE_PROFILE_SELF",
		EntityType: "USER",
		EntityID:   fmt.Sprintf("%d", userID), // Convert int64 to string
		Details:    details,
		IPAddress:  c.IP(),
	})

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}

// DeleteAccount handles DELETE /api/v1/user/account
func (h *SystemSettingsHandler) DeleteAccount(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	// 1. Fetch User details to determine S3 path
	user, err := h.UserRepo.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch user details for cleanup"})
	}

	// 2. Determine S3 Path (Same logic as Upload)
	var path string
	userName := "user"
	if user.Name != nil && *user.Name != "" {
		userName = utils.SanitizeFileName(*user.Name)
	}

	switch user.Role {
	case "super_admin":
		path = fmt.Sprintf("super_admin/%s/", userName)
	case "admin":
		path = fmt.Sprintf("admin/%s/", userName)
	case "coordinator":
		dept := "general"
		if user.DepartmentCode != nil {
			dept = *user.DepartmentCode
		}
		path = fmt.Sprintf("coordinators/%s_%s/", userName, dept)
	case "student":
		// For students, we might use RegNo
		regNo, err := h.UserRepo.GetRegisterNumber(c.Context(), userID)
		if err == nil && regNo != "" {
			path = fmt.Sprintf("students/%s/", regNo) // Delete entire student folder (docs + profile)
		} else {
			path = fmt.Sprintf("users/%d/", userID)
		}
	default:
		path = fmt.Sprintf("users/%d/", userID)
	}

	// 3. Delete from S3
	// We ignore errors here because we still want to delete the account even if S3 fails
	if err := utils.DeleteFolder(path); err != nil {
		// Log error but continue
		// fmt.Printf("Failed to clean up S3 folder %s: %v\n", path, err)
	}

	// 4. Delete from DB
	if err := h.UserRepo.DeleteUser(c.Context(), userID); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete account"})
	}

	// Log Activity (Before deletion, or maybe we can't log if user is deleted?
	// Actually we log with userID, even if user is deleted from users table, the log remains if we use SET NULL or just keep ID)
	// Our migration says: user_id INT REFERENCES users(id) ON DELETE SET NULL.
	// So if we delete user, user_id becomes NULL.
	// But we want to know WHO deleted it.
	// Using SET NULL is fine, but maybe we should log BEFORE delete?
	// The problem is if we Log then Delete, the log's user_id will satisfy FK. Then Delete User -> Log's user_id becomes NULL.
	// We lose the info of who did it unless we store name in details.

	details, _ := json.Marshal(map[string]interface{}{
		"deleted_user_name": *user.Name,
		"reason":            "self_deletion",
	})
	_ = h.LogRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     "DELETE_ACCOUNT_SELF",
		EntityType: "USER",
		EntityID:   fmt.Sprintf("%d", userID),
		Details:    details,
		IPAddress:  c.IP(),
	})

	return c.JSON(fiber.Map{"message": "Account deleted successfully"})
}

// ChangePassword handles PUT /api/v1/user/password
func (h *SystemSettingsHandler) ChangePassword(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	var input struct {
		OldPassword     string `json:"old_password"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.NewPassword == "" || len(input.NewPassword) < 6 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 6 characters long"})
	}

	if input.NewPassword != input.ConfirmPassword {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "New passwords do not match"})
	}

	// 1. Verify Old Password
	currentHash, err := h.UserRepo.GetPasswordHash(c.Context(), userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch user data"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(input.OldPassword)); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Incorrect old password"})
	}

	// 2. Hash New Password
	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process new password"})
	}

	// 3. Update Password
	if err := h.UserRepo.UpdatePassword(c.Context(), userID, string(newHash)); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update password"})
	}

	// Log Activity
	_ = h.LogRepo.CreateLog(c.Context(), models.ActivityLog{
		UserID:     userID,
		Action:     "CHANGE_PASSWORD_SELF",
		EntityType: "USER",
		EntityID:   fmt.Sprintf("%d", userID),
		Details:    nil, // No details for password change security
		IPAddress:  c.IP(),
	})

	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}
