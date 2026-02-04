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

	// Email Body with professional styling
	subject := "Subject: Password Reset Request - Placement Portal\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f8f9fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #002147 0%%, #003d82 100%%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Placement Portal</h1>
                            <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Kongu Engineering College</p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password. Use the One-Time Password (OTP) below to proceed:
                            </p>
                            
                            <!-- OTP Box -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center" style="background-color: #f0f4ff; border: 2px dashed #002147; border-radius: 8px; padding: 24px;">
                                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Your OTP Code</p>
                                        <p style="margin: 0; color: #002147; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">%s</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Info -->
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 4px;">
                                <p style="margin: 0 0 8px 0; color: #856404; font-size: 14px; font-weight: 600;">⚠️ Security Notice</p>
                                <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.6;">
                                    <li>This code expires in <strong>2 minutes</strong></li>
                                    <li>Never share this code with anyone</li>
                                    <li>If you didn't request this, please ignore this email</li>
                                </ul>
                            </div>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                After entering the OTP, you'll be able to create a new password for your account.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">
                                This is an automated message from Placement Portal
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2026 Kongu Engineering College. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
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
