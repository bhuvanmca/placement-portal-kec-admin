package middleware

import (
	"strings"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Protected ensures the user is logged in
func Protected(c *fiber.Ctx) error {
	// 1. Get Token from Header (Authorization: Bearer <token>)
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: No token provided"})
	}

	tokenString := strings.Replace(authHeader, "Bearer ", "", 1)

	// 2. Parse & Validate Token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return utils.SecretKey, nil
	})

	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: Invalid token"})
	}

	// 3. Extract Claims (User ID & Role) and store in Context
	claims := token.Claims.(jwt.MapClaims)
	c.Locals("user_id", claims["user_id"])
	c.Locals("role", claims["role"])

	return c.Next()
}

// AdminOnly ensures the user has admin, coordinator or super_admin role
func AdminOnly(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" && role != "coordinator" && role != "super_admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Admin access required"})
	}
	return c.Next()
}

// SuperAdminOnly ensures the user has 'super_admin' role
func SuperAdminOnly(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "super_admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Super Admin access required"})
	}
	return c.Next()
}

// HasPermission checks if the user has a specific permission granted
func HasPermission(permissionKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Locals("role").(string)

		// Super admin bypasses all permission checks
		if role == "super_admin" {
			return c.Next()
		}

		userID := int64(c.Locals("user_id").(float64))

		var isGranted bool
		err := database.DB.QueryRow(c.Context(),
			"SELECT is_granted FROM role_permissions WHERE user_id = $1 AND permission_key = $2",
			userID, permissionKey,
		).Scan(&isGranted)

		if err != nil || !isGranted {
			return c.Status(403).JSON(fiber.Map{
				"error": "Forbidden: You don't have permission for this action",
			})
		}

		return c.Next()
	}
}

// DepartmentScoped injects department filtering for coordinator users
// It sets c.Locals("department_scope") which handlers can use to filter queries
func DepartmentScoped(c *fiber.Ctx) error {
	role := c.Locals("role").(string)

	if role == "coordinator" {
		userID := int64(c.Locals("user_id").(float64))

		var deptCode *string
		err := database.DB.QueryRow(c.Context(),
			"SELECT department_code FROM users WHERE id = $1",
			userID,
		).Scan(&deptCode)

		if err != nil || deptCode == nil {
			return c.Status(403).JSON(fiber.Map{
				"error": "Coordinator has no department assigned",
			})
		}

		c.Locals("department_scope", *deptCode)
	}
	// For admin and super_admin, no department scope is set (they see everything)

	return c.Next()
}
