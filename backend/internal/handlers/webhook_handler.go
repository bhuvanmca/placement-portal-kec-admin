package handlers

import (
	"fmt"
	"os"
	"strings"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/internal/services"
	"github.com/gofiber/fiber/v2"
)

// HandleWhatsAppWebhook handles both verification (GET) and messages (POST)
// GET /v1/webhooks/whatsapp -> Verification
// POST /v1/webhooks/whatsapp -> Message Processing
func HandleWhatsAppWebhook(c *fiber.Ctx) error {
	// 1. Verification Request (GET)
	if c.Method() == "GET" {
		verifyToken := os.Getenv("WHATSAPP_VERIFY_TOKEN")
		mode := c.Query("hub.mode")
		token := c.Query("hub.verify_token")
		challenge := c.Query("hub.challenge")

		if mode == "subscribe" && token == verifyToken {
			return c.SendString(challenge)
		}
		return c.Status(403).SendString("Verification failed")
	}

	// 2. Incoming Message (POST)
	var payload map[string]interface{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).SendString("Invalid JSON")
	}

	// Basic logging
	// fmt.Printf("Webhook Payload: %+v\n", payload)

	// Extract Message
	// Structure: entry[0].changes[0].value.messages[0]
	entry, ok := payload["entry"].([]interface{})
	if !ok || len(entry) == 0 {
		return c.Status(200).SendString("No entry")
	}

	changes, ok := entry[0].(map[string]interface{})["changes"].([]interface{})
	if !ok || len(changes) == 0 {
		return c.Status(200).SendString("No changes")
	}

	value, ok := changes[0].(map[string]interface{})["value"].(map[string]interface{})
	if !ok {
		return c.Status(200).SendString("No value")
	}

	messages, ok := value["messages"].([]interface{})
	if !ok || len(messages) == 0 {
		// Could be a status update (sent/delivered/read), just ignore
		return c.Status(200).SendString("No messages")
	}

	msgData := messages[0].(map[string]interface{})
	from := msgData["from"].(string) // Provide number

	body := ""
	if msgData["type"] == "text" {
		textBody, ok := msgData["text"].(map[string]interface{})
		if ok {
			body = textBody["body"].(string)
		}
	} else if msgData["type"] == "button" {
		// Handle button replies if you add interactive messages later
		btnBody, ok := msgData["button"].(map[string]interface{})
		if ok {
			body = btnBody["text"].(string)
		}
	}

	fmt.Printf("WhatsApp Cloud: From=%s Body=%s\n", from, body)

	// Bot Logic
	command := strings.ToLower(strings.TrimSpace(body))
	waService := services.NewWhatsAppService()
	response := ""

	switch {
	case strings.Contains(command, "drive") || strings.Contains(command, "job"):
		repo := repository.NewDriveRepository(database.DB)
		drives, err := repo.GetDrives(c.Context(), nil)
		if err != nil {
			response = "Sorry, unavailable right now."
		} else if len(drives) == 0 {
			response = "No active drives."
		} else {
			response = "🚀 *Active Drives* 🚀\n\n"
			for _, d := range drives {
				response += fmt.Sprintf("🏢 *%s*\n💼 %s\n📅 %s\n\n",
					d.CompanyName, d.JobRole, d.DeadlineDate.Format("02 Jan"))
			}
		}

	case strings.Contains(command, "hi") || strings.Contains(command, "hello"):
		response = "👋 KEC Placement Bot.\nSend *Drives* to see jobs."

	default:
		// Optional: Don't reply to everything to save costs/spam
		// response = "Unknown command. Try *Drives*."
		return c.Status(200).SendString("Ignored")
	}

	waService.SendMessage(from, response)
	return c.Status(200).SendString("OK")
}
