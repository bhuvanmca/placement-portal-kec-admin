package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"os"
	"strings"
)

var SecretKey = []byte(os.Getenv("JWT_SECRET"))

func GenerateOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

func GenerateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

// SendWelcomeEmail is a stub — the full implementation would use SMTP
func SendWelcomeEmail(email, name, otp string) error {
	fmt.Printf("[StudentService] Welcome email to %s (%s) with OTP: %s\n", email, name, otp)
	return nil
}

// SanitizeFileName is imported from s3.go, but redeclared here as a fallback
// It replaces non-alphanumeric characters with underscores
func SanitizeInput(name string) string {
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		} else {
			result.WriteRune('_')
		}
	}
	return result.String()
}
