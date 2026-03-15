package utils

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

func SendEmail(toEmail, subject, body string) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}
	host := "smtp.gmail.com"
	port := "587"

	// Sanitize subject to prevent email header injection
	sanitized := strings.NewReplacer("\r", "", "\n", "").Replace(subject)

	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	msg := []byte("Subject: " + sanitized + "\n" + mime + body)

	// Authentication
	auth := smtp.PlainAuth("", from, password, host)

	// Send
	addr := host + ":" + port
	err := smtp.SendMail(addr, auth, from, []string{toEmail}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
