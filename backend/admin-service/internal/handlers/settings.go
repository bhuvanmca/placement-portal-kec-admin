package handlers

import (
	"strconv"

	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type SettingsHandler struct {
	Repo *repository.PermissionRepository
	// We might need StudentRepo to apply changes
	StudentRepo *repository.StudentRepository
}

func NewSettingsHandler(repo *repository.PermissionRepository, studentRepo *repository.StudentRepository) *SettingsHandler {
	return &SettingsHandler{Repo: repo, StudentRepo: studentRepo}
}

// GetFieldPermissions
func (h *SettingsHandler) GetFieldPermissions(c *fiber.Ctx) error {
	perms, err := h.Repo.GetAllPermissions()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch permissions"})
	}
	return c.JSON(perms)
}

// ToggleFieldPermission
func (h *SettingsHandler) ToggleFieldPermission(c *fiber.Ctx) error {
	fieldName := c.Params("name")
	var input struct {
		IsEnabled bool `json:"is_enabled"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := h.Repo.UpdatePermission(fieldName, input.IsEnabled); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update permission"})
	}

	return c.JSON(fiber.Map{"message": "Permission updated"})
}

// GetPendingRequests
func (h *SettingsHandler) GetPendingRequests(c *fiber.Ctx) error {
	reqs, err := h.Repo.GetPendingRequests()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch requests"})
	}
	return c.JSON(reqs)
}

// HandleRequest (Approve/Reject)
func (h *SettingsHandler) HandleRequest(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	action := c.Query("action") // approve or reject

	// Fix: Middleware sets 'user_id' as float64 (from JWT claims)
	var adminID int64
	if v := c.Locals("user_id"); v != nil {
		if f, ok := v.(float64); ok {
			adminID = int64(f)
		} else {
			// Fallback or log if type is unexpected
			adminID = 0
		}
	}

	req, err := h.Repo.GetRequestByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
	}

	switch action {
	case "approve":
		// Apply change using StudentRepo (logic needs to be flexible)
		// We need a method in StudentRepo to update a specific field dynamically or handle it here
		// For simplicity, let's call a specialized method in StudentRepo or construct a partial update
		// But update logic is complex (table separation).
		// Ideally, the 'field_name' maps to a column and table.

		err := h.StudentRepo.ApplyFieldUpdate(req.StudentID, req.FieldName, req.NewValue)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to apply change: " + err.Error()})
		}

		if err := h.Repo.UpdateRequestStatus(id, "approved", adminID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}
	case "reject":
		if err := h.Repo.UpdateRequestStatus(id, "rejected", adminID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}

	return c.JSON(fiber.Map{"message": "Request " + action + "d successfully"})
}
