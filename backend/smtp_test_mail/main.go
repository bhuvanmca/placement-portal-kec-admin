package main

import (
	"bytes"
	"context"
	"crypto/tls"
	_ "embed"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/smtp"
	"strings"
	"time"
)

//go:embed template.html
var templateHTML string

// customResolver uses Google DNS to bypass local DNS issues
func customResolver() *net.Resolver {
	return &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{Timeout: 10 * time.Second}
			return d.DialContext(ctx, "udp", "8.8.8.8:53")
		},
	}
}

const (
	smtpHost = "smtp.gmail.com"
	smtpUser = "kecdrives@kongu.edu"
	smtpPass = "xckv rruu mwrj qvho"
)

type EmailData struct {
	PortalName  string
	Year        int
	TestTime    string
	Recipients  string
	SenderEmail string
}

func main() {
	recipients := []string{
		"harikrishnann.24mca@kongu.edu",
		"bhuvankumarv.24mca@kongu.edu",
	}

	tmpl, err := template.New("email").Parse(templateHTML)
	if err != nil {
		log.Fatalf("Failed to parse template: %v", err)
	}

	data := EmailData{
		PortalName:  "KEC Placement Portal",
		Year:        time.Now().Year(),
		TestTime:    time.Now().Format("02 Jan 2006 03:04:05 PM IST"),
		Recipients:  strings.Join(recipients, ", "),
		SenderEmail: smtpUser,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		log.Fatalf("Failed to execute template: %v", err)
	}

	subject := "KEC Placement Portal - SMTP Test Email"

	// Build the email message with headers
	var msg bytes.Buffer
	msg.WriteString("From: KEC Placement Portal <" + smtpUser + ">\r\n")
	msg.WriteString("To: " + strings.Join(recipients, ", ") + "\r\n")
	msg.WriteString("Subject: " + subject + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	msg.WriteString("\r\n")
	msg.Write(body.Bytes())

	// Resolve SMTP host via Google DNS (8.8.8.8) to bypass local DNS issues
	resolver := customResolver()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fmt.Println("Resolving", smtpHost, "via Google DNS (8.8.8.8)...")
	ips, err := resolver.LookupHost(ctx, smtpHost)
	if err != nil {
		log.Fatalf("DNS resolution failed: %v", err)
	}

	// Filter for IPv4 addresses — most Indian ISPs have broken IPv6 routing
	fmt.Printf("All resolved addresses: %v\n", ips)
	var ipv4 string
	for _, ip := range ips {
		if net.ParseIP(ip) != nil && !strings.Contains(ip, ":") {
			ipv4 = ip
			break
		}
	}
	if ipv4 == "" {
		log.Fatal("No IPv4 address found for ", smtpHost)
	}
	ip := ipv4
	fmt.Printf("Using IPv4: %s\n\n", ip)

	// Try port 465 (SMTPS/implicit TLS) first, fall back to 587 (STARTTLS)
	ports := []string{"465", "587"}

	for _, port := range ports {
		addr := net.JoinHostPort(ip, port)
		fmt.Printf("Trying %s (port %s)...\n", addr, port)
		fmt.Println("Sending email to:", strings.Join(recipients, ", "))

		var sendErr error
		if port == "465" {
			sendErr = sendMailTLS(addr, smtpHost, smtpUser, smtpPass, recipients, msg.Bytes())
		} else {
			sendErr = sendMailSTARTTLS(addr, smtpHost, smtpUser, smtpPass, recipients, msg.Bytes())
		}

		if sendErr != nil {
			fmt.Printf("Port %s failed: %v\n\n", port, sendErr)
			continue
		}

		fmt.Println("Email sent successfully to all recipients!")
		return
	}

	log.Fatal("Failed to send email on all ports")
}

// sendMailTLS sends email using implicit TLS (port 465)
func sendMailTLS(addr, host, user, pass string, recipients []string, msg []byte) error {
	tlsConfig := &tls.Config{ServerName: host}
	dialer := &net.Dialer{Timeout: 30 * time.Second}

	// Force IPv4 to avoid IPv6 routing issues
	conn, err := dialer.Dial("tcp4", addr)
	if err != nil {
		return fmt.Errorf("TCP dial: %w", err)
	}
	tlsConn := tls.Client(conn, tlsConfig)
	if err := tlsConn.Handshake(); err != nil {
		conn.Close()
		return fmt.Errorf("TLS handshake: %w", err)
	}
	defer tlsConn.Close()

	return smtpSession(tlsConn, host, user, pass, recipients, msg)
}

// sendMailSTARTTLS sends email using STARTTLS (port 587)
func sendMailSTARTTLS(addr, host, user, pass string, recipients []string, msg []byte) error {
	dialer := &net.Dialer{Timeout: 30 * time.Second}

	// Force IPv4 to avoid IPv6 routing issues
	conn, err := dialer.Dial("tcp4", addr)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("SMTP client: %w", err)
	}
	defer client.Close()

	tlsConfig := &tls.Config{ServerName: host}
	if err = client.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("STARTTLS: %w", err)
	}

	auth := smtp.PlainAuth("", user, pass, host)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("auth: %w", err)
	}

	if err = client.Mail(user); err != nil {
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

// smtpSession handles the SMTP conversation after connection is established
func smtpSession(conn net.Conn, host, user, pass string, recipients []string, msg []byte) error {
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("SMTP client: %w", err)
	}
	defer client.Close()

	auth := smtp.PlainAuth("", user, pass, host)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("auth: %w", err)
	}

	if err = client.Mail(user); err != nil {
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
