package handlers

import (
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/gofiber/fiber/v2"
)

// ListSpocs returns all active SPOCs
// @Summary List all SPOCs
// @Description Get a list of all Single Points of Contact
// @Tags Spocs
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Spoc
// @Failure 500 {object} map[string]interface{}
// @Router /v1/spocs [get]
func ListSpocs(c *fiber.Ctx) error {
	query := `SELECT id, name, designation, mobile_number, email, is_active FROM spocs WHERE is_active = true ORDER BY name ASC`

	rows, err := database.DB.Query(c.Context(), query)
	if err != nil {
		fmt.Printf("Error fetching spocs: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch SPOCs"})
	}
	defer rows.Close()

	spocs := []models.Spoc{}
	for rows.Next() {
		var s models.Spoc
		// Note: models.Spoc struct: ID, Name, Designation, MobileNumber, Email, IsActive
		if err := rows.Scan(&s.ID, &s.Name, &s.Designation, &s.MobileNumber, &s.Email, &s.IsActive); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to process SPOC data"})
		}
		spocs = append(spocs, s)
	}

	return c.JSON(spocs)
}

// CreateSpoc adds a new SPOC
// @Summary Create a new SPOC
// @Description Add a new Single Point of Contact
// @Tags Spocs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param spoc body models.CreateSpocInput true "SPOC Details"
// @Success 201 {object} models.Spoc
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/spocs [post]
func CreateSpoc(c *fiber.Ctx) error {
	var input models.CreateSpocInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	query := `
		INSERT INTO spocs (name, designation, mobile_number, email, is_active, created_at)
		VALUES ($1, $2, $3, $4, true, NOW())
		RETURNING id, name, designation, mobile_number, email, is_active, created_at
	`

	var s models.Spoc
	err := database.DB.QueryRow(c.Context(), query,
		input.Name, input.Designation, input.MobileNumber, input.Email,
	).Scan(&s.ID, &s.Name, &s.Designation, &s.MobileNumber, &s.Email, &s.IsActive, &s.CreatedAt)

	if err != nil {
		fmt.Printf("Error creating spoc: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create SPOC"})
	}

	return c.Status(201).JSON(s)
}

// UpdateSpoc updates an existing SPOC
// @Summary Update SPOC
// @Description Update SPOC details
// @Tags Spocs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "SPOC ID"
// @Param spoc body models.CreateSpocInput true "SPOC Details"
// @Success 200 {object} models.Spoc
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/spocs/{id} [put]
func UpdateSpoc(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "SPOC ID required"})
	}

	var input models.CreateSpocInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	query := `
		UPDATE spocs 
		SET name = $1, designation = $2, mobile_number = $3, email = $4
		WHERE id = $5
		RETURNING id, name, designation, mobile_number, email, is_active, created_at
	`

	var s models.Spoc
	err := database.DB.QueryRow(c.Context(), query,
		input.Name, input.Designation, input.MobileNumber, input.Email, id,
	).Scan(&s.ID, &s.Name, &s.Designation, &s.MobileNumber, &s.Email, &s.IsActive, &s.CreatedAt)

	if err != nil {
		fmt.Printf("Error updating spoc: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update SPOC"})
	}

	return c.JSON(s)
}

// DeleteSpoc deletes a SPOC
// @Summary Delete SPOC
// @Description Delete a SPOC by ID
// @Tags Spocs
// @Security BearerAuth
// @Param id path int true "SPOC ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/spocs/{id} [delete]
func DeleteSpoc(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "SPOC ID required"})
	}

	query := `DELETE FROM spocs WHERE id = $1`
	_, err := database.DB.Exec(c.Context(), query, id)
	if err != nil {
		fmt.Printf("Error deleting spoc: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete SPOC"})
	}

	return c.JSON(fiber.Map{"message": "SPOC deleted successfully"})
}

// ToggleSpocStatus toggles SPOC active status
// @Summary Toggle SPOC Status
// @Description Activate or deactivate a SPOC
// @Tags Spocs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "SPOC ID"
// @Param status body map[string]bool true "Status"
// @Success 200 {object} models.Spoc
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/admin/spocs/{id}/status [put]
func ToggleSpocStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "SPOC ID required"})
	}

	var input struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	query := `
		UPDATE spocs 
		SET is_active = $1
		WHERE id = $2
		RETURNING id, name, designation, mobile_number, email, is_active, created_at
	`

	var s models.Spoc
	err := database.DB.QueryRow(c.Context(), query, input.IsActive, id).Scan(
		&s.ID, &s.Name, &s.Designation, &s.MobileNumber, &s.Email, &s.IsActive, &s.CreatedAt,
	)

	if err != nil {
		fmt.Printf("Error toggling spoc status: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update SPOC status"})
	}

	return c.JSON(s)
}
