package utils

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
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

	// Try port 465 (implicit TLS) first
	if err := sendMailTLS(dialer, tlsConfig, from, password, recipients, msg); err == nil {
		return nil
	}

	// Fall back to port 587 (STARTTLS)
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

func SendOTPEmail(toEmail, otp string) error {
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
	return sendRawEmail([]string{toEmail}, msg)
}
