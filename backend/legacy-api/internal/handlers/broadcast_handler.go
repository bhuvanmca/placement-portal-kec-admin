package handlers

import (
	"log"
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type BroadcastHandler struct {
	Repo *repository.BroadcastRepository
}

func NewBroadcastHandler(repo *repository.BroadcastRepository) *BroadcastHandler {
	return &BroadcastHandler{Repo: repo}
}

func (h *BroadcastHandler) CreateTemplate(c *fiber.Ctx) error {
	var tmpl models.BroadcastTemplate
	if err := c.BodyParser(&tmpl); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	userID := int64(c.Locals("user_id").(float64))
	tmpl.CreatedBy = &userID

	if err := h.Repo.CreateTemplate(&tmpl); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create template"})
	}
	return c.Status(201).JSON(fiber.Map{"message": "Template created"})
}

func (h *BroadcastHandler) GetTemplates(c *fiber.Ctx) error {
	tmpls, err := h.Repo.GetAllTemplates()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch templates"})
	}
	return c.JSON(tmpls)
}

func (h *BroadcastHandler) DeleteTemplate(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	if err := h.Repo.DeleteTemplate(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete template"})
	}
	return c.JSON(fiber.Map{"message": "Template deleted"})
}

type BroadcastRequest struct {
	Type        string    `json:"type"`         // WHATSAPP or EMAIL
	TargetGroup string    `json:"target_group"` // all_students, placed_students, unplaced_students
	Batch       *string   `json:"batch"`        // Optional filter
	Department  *string   `json:"department"`   // Optional filter
	RollNos     *[]string `json:"roll_nos"`     // Optional roll numbers
	Names       *[]string `json:"names"`        // Optional names
	Subject     string    `json:"subject"`      // Email subject
	Message     string    `json:"message"`
}

func (h *BroadcastHandler) SendBroadcast(c *fiber.Ctx) error {
	var req BroadcastRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	log.Printf("Received Broadcast Request: Type=%s, Target=%s", req.Type, req.TargetGroup)
	if req.Batch != nil {
		log.Printf("Filter: Batch=%s", *req.Batch)
	}
	if req.Department != nil {
		log.Printf("Filter: Dept=%s", *req.Department)
	}
	if req.RollNos != nil {
		log.Printf("Filter: RollNos=%v", *req.RollNos)
	}

	// Placeholder for Meta WhatsApp API and Amazon SES
	switch req.Type {
	case "WHATSAPP":
		log.Println(">>> [PLACEHOLDER] Sending via Meta WhatsApp Cloud API...")
		// TODO: Integrate Meta Cloud API SDK here
	case "EMAIL":
		log.Println(">>> [PLACEHOLDER] Sending via Amazon SES...")
		// TODO: Integrate Amazon SES SDK here
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Unsupported channel type"})
	}

	return c.JSON(fiber.Map{
		"message": "Broadcast queued successfully",
		"details": fiber.Map{
			"channel": req.Type,
			"target":  req.TargetGroup,
			"status":  "pending_provider_integration",
		},
	})
}
