package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// ListManagedUsers returns all admin and coordinator users
func ListManagedUsers(c *fiber.Ctx) error {
	search := c.Query("search", "")
	role := c.Query("role", "")

	repo := repository.NewUserManagementRepository(database.DB)
	users, err := repo.ListManagedUsers(c.Context(), search, role)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch users: " + err.Error()})
	}
	if users == nil {
		users = []repository.ManagedUser{}
	}
	return c.JSON(users)
}

// CreateManagedUser creates a new admin or coordinator
func CreateManagedUser(c *fiber.Ctx) error {
	var input struct {
		Email          string   `json:"email"`
		Password       string   `json:"password"`
		Role           string   `json:"role"`
		Name           *string  `json:"name"`
		DepartmentCode *string  `json:"department_code"`
		Permissions    []string `json:"permissions"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Validate role
	if input.Role != "admin" && input.Role != "coordinator" {
		return c.Status(400).JSON(fiber.Map{"error": "Role must be 'admin' or 'coordinator'"})
	}

	// Coordinator must have department
	if input.Role == "coordinator" && (input.DepartmentCode == nil || *input.DepartmentCode == "") {
		return c.Status(400).JSON(fiber.Map{"error": "Coordinator must have a department assigned"})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to process password"})
	}

	repo := repository.NewUserManagementRepository(database.DB)
	userID, err := repo.CreateManagedUser(c.Context(), input.Email, string(hashedPassword), input.Role, input.Name, input.DepartmentCode)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user: " + err.Error()})
	}

	// Set permissions if provided
	if len(input.Permissions) > 0 {
		superAdminID := int64(c.Locals("user_id").(float64))
		if err := repo.SetUserPermissions(c.Context(), userID, input.Permissions, superAdminID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "User created but failed to set permissions"})
		}
	}

	// Log activity
	details, _ := json.Marshal(map[string]interface{}{
		"created_user_id": userID,
		"email":           input.Email,
		"role":            input.Role,
	})
	superAdminID := int64(c.Locals("user_id").(float64))
	repo.LogActivity(c.Context(), superAdminID, "create_user", string(details))

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "User created successfully",
		"user_id": userID,
	})
}

// UpdateManagedUser updates an admin or coordinator user
func UpdateManagedUser(c *fiber.Ctx) error {
	userID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var input struct {
		Name           *string  `json:"name"`
		Role           string   `json:"role"`
		DepartmentCode *string  `json:"department_code"`
		IsActive       bool     `json:"is_active"`
		Permissions    []string `json:"permissions"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Role != "admin" && input.Role != "coordinator" {
		return c.Status(400).JSON(fiber.Map{"error": "Role must be 'admin' or 'coordinator'"})
	}

	repo := repository.NewUserManagementRepository(database.DB)

	if err := repo.UpdateManagedUser(c.Context(), userID, input.Name, input.Role, input.DepartmentCode, input.IsActive); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user: " + err.Error()})
	}

	// Update permissions
	if input.Permissions != nil {
		superAdminID := int64(c.Locals("user_id").(float64))
		if err := repo.SetUserPermissions(c.Context(), userID, input.Permissions, superAdminID); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "User updated but failed to set permissions"})
		}
	}

	// Log activity
	details, _ := json.Marshal(map[string]interface{}{
		"updated_user_id": userID,
		"role":            input.Role,
	})
	superAdminID := int64(c.Locals("user_id").(float64))
	repo.LogActivity(c.Context(), superAdminID, "update_user", string(details))

	return c.JSON(fiber.Map{"success": true, "message": "User updated successfully"})
}

// DeleteManagedUser deletes an admin or coordinator user
func DeleteManagedUser(c *fiber.Ctx) error {
	userID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	repo := repository.NewUserManagementRepository(database.DB)
	if err := repo.DeleteManagedUser(c.Context(), userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Log activity
	details, _ := json.Marshal(map[string]interface{}{
		"deleted_user_id": userID,
	})
	superAdminID := int64(c.Locals("user_id").(float64))
	repo.LogActivity(c.Context(), superAdminID, "delete_user", string(details))

	return c.JSON(fiber.Map{"success": true, "message": "User deleted successfully"})
}

// GetUserPermissions returns permissions for a specific user
func GetUserPermissions(c *fiber.Ctx) error {
	userID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	repo := repository.NewUserManagementRepository(database.DB)
	perms, err := repo.GetUserPermissions(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch permissions"})
	}

	return c.JSON(fiber.Map{"permissions": perms})
}

// UpdateUserPermissions replaces all permissions for a user
func UpdateUserPermissions(c *fiber.Ctx) error {
	userID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var input struct {
		Permissions []string `json:"permissions"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	superAdminID := int64(c.Locals("user_id").(float64))
	repo := repository.NewUserManagementRepository(database.DB)

	if err := repo.SetUserPermissions(c.Context(), userID, input.Permissions, superAdminID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update permissions"})
	}

	// Log activity
	details, _ := json.Marshal(map[string]interface{}{
		"target_user_id": userID,
		"permissions":    input.Permissions,
	})
	repo.LogActivity(c.Context(), superAdminID, "update_permissions", string(details))

	return c.JSON(fiber.Map{"success": true, "message": "Permissions updated"})
}

// GetActivityLog returns recent activity log entries
func GetActivityLog(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	sortBy := c.Query("sort_by", "created_at")
	sortOrder := c.Query("sort_order", "DESC")

	if page < 1 {
		page = 1
	}

	offset := (page - 1) * limit

	if limit > 100 {
		limit = 100
	}

	repo := repository.NewUserManagementRepository(database.DB)
	entries, total, err := repo.GetActivityLog(c.Context(), limit, offset, sortBy, sortOrder)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch activity log"})
	}

	return c.JSON(fiber.Map{
		"logs":  entries,
		"total": total,
		"limit": limit,
		"page":  page,
	})
}

// GetAllPermissionKeys returns the list of all available permission keys
func GetAllPermissionKeys(c *fiber.Ctx) error {
	keys := []map[string]string{
		{"key": "manage_drives", "label": "Manage Drives", "description": "Create, edit, delete placement drives"},
		{"key": "manage_students", "label": "Manage Students", "description": "View and edit student records"},
		{"key": "approve_changes", "label": "Approve Changes", "description": "Approve student change requests"},
		{"key": "manage_spocs", "label": "Manage SPOCs", "description": "Create and modify SPOCs"},
		{"key": "manage_storage", "label": "Manage Storage", "description": "Access cloud storage admin panel"},
		{"key": "export_data", "label": "Export Data", "description": "Export and download archived data"},
		{"key": "manual_drive_ops", "label": "Manual Drive Ops", "description": "Add/remove students from drives, update status"},
		{"key": "view_analytics", "label": "View Analytics", "description": "View placement analytics"},
	}

	return c.JSON(fiber.Map{
		"permissions": keys,
	})
}

// GetDepartmentsList returns all departments for coordinator assignment
func GetDepartmentsList(c *fiber.Ctx) error {
	rows, err := database.DB.Query(c.Context(),
		`SELECT code, name, type FROM departments WHERE is_active = TRUE ORDER BY name`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch departments"})
	}
	defer rows.Close()

	var departments []map[string]string
	for rows.Next() {
		var code, name, deptType string
		if rows.Scan(&code, &name, &deptType) == nil {
			departments = append(departments, map[string]string{
				"code": code,
				"name": fmt.Sprintf("%s (%s)", name, deptType),
				"type": deptType,
			})
		}
	}

	return c.JSON(departments)
}
