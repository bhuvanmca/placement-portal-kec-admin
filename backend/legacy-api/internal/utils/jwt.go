package utils

import (
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

var SecretKey = []byte(config.GetJWTSecret()) // In prod, read from os.Getenv("JWT_SECRET")

func GenerateToken(userID int64, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(time.Hour * 24 * 30).Unix(), // Token valid for 30 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(SecretKey)
}
