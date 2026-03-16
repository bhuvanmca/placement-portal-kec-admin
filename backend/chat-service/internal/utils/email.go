package utils

import (
	"crypto/tls"
	"fmt"
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

func SendEmail(toEmail, subject, body string) error {
	// Sanitize subject to prevent email header injection
	sanitized := strings.NewReplacer("\r", "", "\n", "").Replace(subject)

	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	msg := []byte("Subject: " + sanitized + "\n" + mime + body)

	return sendRawEmail([]string{toEmail}, msg)
}
