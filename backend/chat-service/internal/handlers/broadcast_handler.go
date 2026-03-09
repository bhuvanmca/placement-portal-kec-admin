package handlers

import (
	"log"

	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/utils"
	"github.com/gofiber/fiber/v2"
)

type BroadcastRequest struct {
	Channels   []string `json:"channels"` // "email", "whatsapp"
	Recipients []string `json:"recipients"`
	Subject    string   `json:"subject"` // For email
	Message    string   `json:"message"`
}

func BroadcastMessage(c *fiber.Ctx) error {
	var req BroadcastRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// This should be optimized with a worker pool for large numbers of recipients
	go func() {
		for _, recipient := range req.Recipients {
			for _, channel := range req.Channels {
				switch channel {
				case "email":
					// Assuming recipient is an email address
					if err := utils.SendEmail(recipient, req.Subject, req.Message); err != nil {
						log.Printf("Failed to send email to %s: %v", recipient, err)
					}
				case "whatsapp":
					// Assuming recipient includes country code or we standardize it
					// e.g., recipient = "+919876543210"
					if err := utils.SendWhatsAppMessage(recipient, req.Message); err != nil {
						log.Printf("Failed to send whatsapp to %s: %v", recipient, err)
					}
				}
			}
		}
	}()

	return c.JSON(fiber.Map{"message": "Broadcast initiated"})
}
