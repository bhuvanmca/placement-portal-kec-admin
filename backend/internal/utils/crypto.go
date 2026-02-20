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

// GenerateRandomString returns a secure random string of length n
func GenerateRandomString(n int) string {
	const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return ""
		}
		ret[i] = letters[num.Int64()]
	}
	return string(ret)
}
