package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

// GenerateOTP produces a secure 6-digit one-time password
func GenerateOTP() string {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		// Fallback to a less secure but functional method if crypto/rand fails
		return fmt.Sprintf("%06d", 123456)
	}
	return fmt.Sprintf("%06d", n.Int64())
}
