package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GetJWTSecret retrieves the JWT secret with a local fallback
func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "fallback_secret_for_local_dev_only"
	}
	return secret
}

var SecretKey = []byte(GetJWTSecret())

// GenerateToken creates a JWT for inter-service and frontend auth
func GenerateToken(userID int64, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(time.Hour * 24 * 30).Unix(), // Token valid for 30 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(SecretKey)
}
