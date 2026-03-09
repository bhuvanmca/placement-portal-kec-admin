package handlers

import (
	"fmt"
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type EligibilityHandler struct {
	Repo *repository.EligibilityRepository
}

func NewEligibilityHandler(repo *repository.EligibilityRepository) *EligibilityHandler {
	return &EligibilityHandler{Repo: repo}
}

func (h *EligibilityHandler) ListTemplates(c *fiber.Ctx) error {
	templates, err := h.Repo.GetAllTemplates(c.Context())
	if err != nil {
		fmt.Printf("Error fetching templates: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch eligibility templates"})
	}
	return c.JSON(templates)
}

func (h *EligibilityHandler) CreateTemplate(c *fiber.Ctx) error {
	var input models.CreateEligibilityTemplateInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	adminID := int64(c.Locals("user_id").(float64))

	err := h.Repo.CreateTemplate(c.Context(), input, adminID)
	if err != nil {
		fmt.Printf("Error creating template: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create eligibility template"})
	}

	return c.Status(201).JSON(fiber.Map{"message": "Template created successfully"})
}

func (h *EligibilityHandler) UpdateTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid template ID"})
	}

	var input models.CreateEligibilityTemplateInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	err = h.Repo.UpdateTemplate(c.Context(), id, input)
	if err != nil {
		fmt.Printf("Error updating template: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update eligibility template"})
	}

	return c.JSON(fiber.Map{"message": "Template updated successfully"})
}

func (h *EligibilityHandler) DeleteTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid template ID"})
	}

	err = h.Repo.DeleteTemplate(c.Context(), id)
	if err != nil {
		fmt.Printf("Error deleting template: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete eligibility template"})
	}

	return c.JSON(fiber.Map{"message": "Template deleted successfully"})
}

func (h *EligibilityHandler) GetTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid template ID"})
	}

	template, err := h.Repo.GetTemplateByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Template not found"})
	}

	return c.JSON(template)
}
