package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendOTPEmail(toEmail, otp string) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := "smtp.gmail.com"
	port := "587"

	// Email Body
	subject := "Subject: Password Reset Request\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
        <html>
            <body>
                <h2>Password Reset</h2>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="color:blue;">%s</h1>
                <p>This code expires in 15 minutes.</p>
            </body>
        </html>
    `, otp)

	msg := []byte(subject + mime + body)

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
