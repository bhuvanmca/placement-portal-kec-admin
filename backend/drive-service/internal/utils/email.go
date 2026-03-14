package utils

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// SendDriveNotificationEmails sends email notifications to eligible students about a new drive.
// Emails are sent in batches to avoid SMTP limits.
func SendDriveNotificationEmails(emails []string, companyName, jobDescription, driveDate, deadline string) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := "smtp.gmail.com"
	port := "587"

	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	auth := smtp.PlainAuth("", from, password, host)
	addr := host + ":" + port

	// Truncate description for email
	desc := jobDescription
	if len(desc) > 300 {
		desc = desc[:300] + "..."
	}

	subject := fmt.Sprintf("Subject: New Placement Drive - %s | KEC Placement Portal\n", companyName)
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"

	body := buildDriveEmailHTML(companyName, desc, driveDate, deadline)
	msg := []byte(subject + mime + body)

	// Send in batches of 50 to avoid SMTP rate limits
	batchSize := 50
	for i := 0; i < len(emails); i += batchSize {
		end := i + batchSize
		if end > len(emails) {
			end = len(emails)
		}
		batch := emails[i:end]

		// Use BCC by sending to each recipient individually
		for _, email := range batch {
			if err := smtp.SendMail(addr, auth, from, []string{email}, msg); err != nil {
				fmt.Printf("Email Error: Failed to send to %s: %v\n", email, err)
				// Continue sending to others
				continue
			}
		}

		// Small delay between batches
		if end < len(emails) {
			time.Sleep(2 * time.Second)
		}
	}

	return nil
}

func buildDriveEmailHTML(companyName, description, driveDate, deadline string) string {
	// Escape HTML in dynamic content
	companyName = escapeHTML(companyName)
	description = escapeHTML(description)

	return fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Placement Drive</title>
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
                            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">🎯 New Placement Drive!</h2>
                            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                A new placement opportunity has been posted. Check the details below:
                            </p>
                            
                            <!-- Drive Details -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 24px 0; background-color: #f0f4ff; border-radius: 8px; border: 1px solid #dbeafe;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; color: #002147; font-size: 22px; font-weight: 700;">%s</h3>
                                        <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">%s</p>
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 4px 0;">
                                                    <span style="color: #6b7280; font-size: 14px;">📅 Drive Date: </span>
                                                    <strong style="color: #1a1a1a; font-size: 14px;">%s</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 0;">
                                                    <span style="color: #6b7280; font-size: 14px;">⏰ Apply Before: </span>
                                                    <strong style="color: #dc2626; font-size: 14px;">%s</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA -->
                            <div style="text-align: center; margin: 32px 0;">
                                <p style="margin: 0; color: #002147; font-size: 16px; font-weight: 600;">
                                    Open the KEC Placement App to view full details and apply!
                                </p>
                            </div>
                            
                            <!-- Info -->
                            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #065f46; font-size: 14px;">
                                    💡 Make sure your profile is up-to-date to check eligibility for this drive.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">
                                This is an automated notification from Placement Portal
                            </p>
                            <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                                You received this email because you are registered on the KEC Placement Portal.
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
`, companyName, description, driveDate, deadline)
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")
	return s
}
