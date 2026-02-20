package utils

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// GetUserID safely extracts the user ID from the context (JWT or Locals)
func GetUserID(c *fiber.Ctx) int64 {
	var userID int64

	// 1. Try to get from JWT claims (standard way)
	if userVal := c.Locals("user"); userVal != nil {
		if token, ok := userVal.(*jwt.Token); ok {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				// Debug logging
				// fmt.Printf("Claims: %+v\n", claims)

				// Standard keys
				if uidFloat, ok := claims["user_id"].(float64); ok {
					userID = int64(uidFloat)
				} else if uidStr, ok := claims["user_id"].(string); ok {
					if parsed, err := strconv.ParseInt(uidStr, 10, 64); err == nil {
						userID = parsed
					}
				} else if sub, ok := claims["sub"].(string); ok {
					if parsed, err := strconv.ParseInt(sub, 10, 64); err == nil {
						userID = parsed
					}
				}
			}
		}
	}

	// 2. If not found in JWT, try c.Locals("user_id") (set by other middleware)
	if userID == 0 {
		if uidVal := c.Locals("user_id"); uidVal != nil {
			if uidStr, ok := uidVal.(string); ok {
				if parsed, err := strconv.ParseInt(uidStr, 10, 64); err == nil {
					userID = parsed
				}
			} else if uidInt, ok := uidVal.(int); ok {
				userID = int64(uidInt)
			} else if uidInt64, ok := uidVal.(int64); ok {
				userID = uidInt64
			}
		}
	}

	// 3. Fallback to Query param (for dev/testing only)
	if userID == 0 {
		if uidStr := c.Query("user_id"); uidStr != "" {
			if parsed, err := strconv.ParseInt(uidStr, 10, 64); err == nil {
				userID = parsed
			}
		}
	}

	return userID
}
