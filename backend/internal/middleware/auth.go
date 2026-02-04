package middleware

import (
	"strings"

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

// AdminOnly ensures the user has 'admin' role
func AdminOnly(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Admins only"})
	}
	return c.Next()
}
