package utils

import (
	"crypto/rand"
	"crypto/tls"
	"fmt"
	"math/big"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"
)

const smtpHost = "smtp.gmail.com"

// sendRawEmail sends an email using IPv4-forced connections with port 465 (implicit TLS)
// fallback to port 587 (STARTTLS) to handle networks with broken IPv6 routing.
func sendRawEmail(recipients []string, msg []byte) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	dialer := &net.Dialer{Timeout: 30 * time.Second}
	tlsConfig := &tls.Config{ServerName: smtpHost}

	if err := sendMailTLS(dialer, tlsConfig, from, password, recipients, msg); err == nil {
		return nil
	}

	return sendMailSTARTTLS(dialer, tlsConfig, from, password, recipients, msg)
}

func sendMailTLS(dialer *net.Dialer, tlsConfig *tls.Config, from, password string, recipients []string, msg []byte) error {
	conn, err := dialer.Dial("tcp4", smtpHost+":465")
	if err != nil {
		return fmt.Errorf("TCP dial: %w", err)
	}
	tlsConn := tls.Client(conn, tlsConfig)
	if err := tlsConn.Handshake(); err != nil {
		conn.Close()
		return fmt.Errorf("TLS handshake: %w", err)
	}
	defer tlsConn.Close()

	return smtpSession(tlsConn, from, password, recipients, msg)
}

func sendMailSTARTTLS(dialer *net.Dialer, tlsConfig *tls.Config, from, password string, recipients []string, msg []byte) error {
	conn, err := dialer.Dial("tcp4", smtpHost+":587")
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}

	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		conn.Close()
		return fmt.Errorf("SMTP client: %w", err)
	}
	defer client.Close()

	if err = client.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("STARTTLS: %w", err)
	}

	auth := smtp.PlainAuth("", from, password, smtpHost)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("auth: %w", err)
	}

	if err = client.Mail(from); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	for _, rcpt := range recipients {
		if err = client.Rcpt(rcpt); err != nil {
			return fmt.Errorf("rcpt to %s: %w", rcpt, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err = w.Write(msg); err != nil {
		return fmt.Errorf("write: %w", err)
	}
	if err = w.Close(); err != nil {
		return fmt.Errorf("close data: %w", err)
	}
	return client.Quit()
}

func smtpSession(conn net.Conn, from, password string, recipients []string, msg []byte) error {
	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return fmt.Errorf("SMTP client: %w", err)
	}
	defer client.Close()

	auth := smtp.PlainAuth("", from, password, smtpHost)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("auth: %w", err)
	}

	if err = client.Mail(from); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	for _, rcpt := range recipients {
		if err = client.Rcpt(rcpt); err != nil {
			return fmt.Errorf("rcpt to %s: %w", rcpt, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err = w.Write(msg); err != nil {
		return fmt.Errorf("write: %w", err)
	}
	if err = w.Close(); err != nil {
		return fmt.Errorf("close data: %w", err)
	}
	return client.Quit()
}

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

// SendWelcomeEmail sends a welcome email with credentials to a newly created student
func SendWelcomeEmail(toEmail, name, otp string) error {
	subject := "Subject: Welcome to KEC Placement Portal\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f8f9fa;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="background-color:#f8f9fa;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#002147 0%%,#003d82 100%%);padding:40px 30px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Placement Portal</h1>
<p style="margin:8px 0 0 0;color:#e0e7ff;font-size:14px;">Kongu Engineering College</p>
</td></tr>
<tr><td style="padding:40px 30px;">
<h2 style="margin:0 0 16px 0;color:#1a1a1a;font-size:24px;">Welcome, %s! 🎉</h2>
<p style="margin:0 0 24px 0;color:#6b7280;font-size:16px;line-height:1.6;">Your account has been created on the KEC Placement Portal. Use the credentials below to log in:</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin:0 0 24px 0;background-color:#f0f4ff;border-radius:8px;border:1px solid #dbeafe;">
<tr><td style="padding:24px;">
<p style="margin:0 0 8px 0;color:#6b7280;font-size:14px;">Email</p>
<p style="margin:0 0 16px 0;color:#002147;font-size:18px;font-weight:700;">%s</p>
<p style="margin:0 0 8px 0;color:#6b7280;font-size:14px;">Temporary Password</p>
<p style="margin:0;color:#002147;font-size:18px;font-weight:700;letter-spacing:2px;">%s</p>
</td></tr>
</table>
<div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:4px;">
<p style="margin:0;color:#92400e;font-size:14px;">⚠️ Please change your password after your first login.</p>
</div>
</td></tr>
<tr><td style="background-color:#f8f9fa;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:12px;">&copy; 2026 Kongu Engineering College. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
`, escapeHTML(name), escapeHTML(toEmail), escapeHTML(otp))

	msg := []byte(subject + mime + body)
	return sendRawEmail([]string{toEmail}, msg)
}

// SendProfileUpdateEmail sends a confirmation email when a student updates their profile
func SendProfileUpdateEmail(toEmail, name string) error {
	subject := "Subject: Profile Updated - KEC Placement Portal\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f8f9fa;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="background-color:#f8f9fa;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#002147 0%%,#003d82 100%%);padding:40px 30px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Placement Portal</h1>
<p style="margin:8px 0 0 0;color:#e0e7ff;font-size:14px;">Kongu Engineering College</p>
</td></tr>
<tr><td style="padding:40px 30px;">
<h2 style="margin:0 0 16px 0;color:#1a1a1a;font-size:24px;">Profile Updated ✅</h2>
<p style="margin:0 0 24px 0;color:#6b7280;font-size:16px;line-height:1.6;">
Hi %s, your personal information on the KEC Placement Portal has been updated successfully.
</p>
<div style="background-color:#ecfdf5;border-left:4px solid #10b981;padding:16px 20px;border-radius:4px;margin:0 0 24px 0;">
<p style="margin:0;color:#065f46;font-size:14px;">If you did not make this change, please contact the placement cell immediately.</p>
</div>
<p style="margin:0;color:#6b7280;font-size:14px;">Some changes to restricted fields may require admin approval before they take effect.</p>
</td></tr>
<tr><td style="background-color:#f8f9fa;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:12px;">&copy; 2026 Kongu Engineering College. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
`, escapeHTML(name))

	msg := []byte(subject + mime + body)
	return sendRawEmail([]string{toEmail}, msg)
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")
	return s
}

// SanitizeInput replaces non-alphanumeric characters with underscores
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
