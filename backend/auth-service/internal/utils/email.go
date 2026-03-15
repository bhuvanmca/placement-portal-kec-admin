package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendOTPEmail(toEmail, otp string) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}
	host := "smtp.gmail.com"
	port := "587"

	subject := "Subject: Password Reset Request - Placement Portal\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Password Reset</title></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#f8f9fa">
<table cellpadding="0" cellspacing="0" width="100%%" style="padding:40px 20px">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:12px">
<tr><td style="background:linear-gradient(135deg,#002147 0%%,#003d82 100%%);padding:40px 30px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:28px">Placement Portal</h1>
<p style="margin:8px 0 0;color:#e0e7ff;font-size:14px">Kongu Engineering College</p>
</td></tr>
<tr><td style="padding:40px 30px">
<h2 style="margin:0 0 16px;color:#1a1a1a;font-size:24px">Password Reset Request</h2>
<p style="margin:0 0 24px;color:#6b7280;font-size:16px">Use the OTP below to reset your password:</p>
<table cellpadding="0" cellspacing="0" width="100%%" style="margin:0 0 32px">
<tr><td align="center" style="background:#f0f4ff;border:2px dashed #002147;border-radius:8px;padding:24px">
<p style="margin:0 0 8px;color:#6b7280;font-size:14px;text-transform:uppercase">Your OTP Code</p>
<p style="margin:0;color:#002147;font-size:42px;font-weight:700;letter-spacing:8px;font-family:monospace">%s</p>
</td></tr></table>
<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:16px 20px;margin:0 0 24px;border-radius:4px">
<p style="margin:0 0 8px;color:#856404;font-size:14px;font-weight:600">Security Notice</p>
<ul style="margin:0;padding-left:20px;color:#856404;font-size:14px">
<li>This code expires in 10 minutes</li>
<li>Never share this code with anyone</li>
<li>If you did not request this, ignore this email</li>
</ul></div>
</td></tr>
<tr><td style="background:#f8f9fa;padding:30px;text-align:center;border-top:1px solid #e5e7eb">
<p style="margin:0;color:#9ca3af;font-size:12px">Automated message from Placement Portal - Kongu Engineering College</p>
</td></tr>
</table></td></tr></table>
</body></html>
`, otp)

	msg := []byte(subject + mime + body)
	auth := smtp.PlainAuth("", from, password, host)
	addr := host + ":" + port
	if err := smtp.SendMail(addr, auth, from, []string{toEmail}, msg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}
