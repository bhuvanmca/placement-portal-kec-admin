package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/placement-portal-kec/student-service/internal/utils"
)

func Protected(c *fiber.Ctx) error {
	return JWTMiddleware()(c)
}

func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: No token provided"})
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return utils.SecretKey, nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: Invalid token"})
		}

		claims := token.Claims.(jwt.MapClaims)
		c.Locals("user_id", claims["user_id"])
		c.Locals("role", claims["role"])
		return c.Next()
	}
}

func AdminOnly(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "admin" && role != "coordinator" && role != "super_admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Admin access required"})
	}
	return c.Next()
}

func SuperAdminOnly(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	if role != "super_admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Super Admin access required"})
	}
	return c.Next()
}
