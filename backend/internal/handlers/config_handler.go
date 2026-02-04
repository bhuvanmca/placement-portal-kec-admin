package handlers

import (
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// GetDepartments returns all departments
// @Summary List Departments
// @Tags Config
// @Produce json
// @Success 200 {array} models.Department
// @Router /v1/config/departments [get]
func GetDepartments(c *fiber.Ctx) error {
	repo := repository.NewConfigRepository(database.DB)
	depts, err := repo.GetAllDepartments(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch departments"})
	}
	return c.JSON(depts)
}

// AddDepartment adds a new department
// @Summary Add Department
// @Tags Config
// @Accept json
// @Produce json
// @Param dept body models.Department true "Department Data"
// @Success 201 {object} map[string]interface{}
// @Router /v1/admin/config/departments [post]
func AddDepartment(c *fiber.Ctx) error {
	var input models.Department
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewConfigRepository(database.DB)
	if err := repo.CreateDepartment(c.Context(), input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create department", "details": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"message": "Department added successfully"})
}

// DeleteDepartment removes a department
// @Summary Remove Department
// @Tags Config
// @Param id path int true "Department ID"
// @Success 200 {object} map[string]interface{}
// @Router /v1/admin/config/departments/{id} [delete]
func DeleteDepartment(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	repo := repository.NewConfigRepository(database.DB)
	if err := repo.DeleteDepartment(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete department", "details": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Department deleted"})
}

// UpdateDepartment updates a department
// @Summary Update Department
// @Tags Config
// @Accept json
// @Produce json
// @Param id path int true "Department ID"
// @Param dept body models.Department true "Department Data"
// @Success 200 {object} map[string]interface{}
// @Router /v1/admin/config/departments/{id} [put]
func UpdateDepartment(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	var input models.Department
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewConfigRepository(database.DB)
	if err := repo.UpdateDepartment(c.Context(), id, input); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update department", "details": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Department updated successfully"})
}

// GetBatches returns all batches
// @Summary List Batches
// @Tags Config
// @Produce json
// @Success 200 {array} models.Batch
// @Router /v1/config/batches [get]
func GetBatches(c *fiber.Ctx) error {
	repo := repository.NewConfigRepository(database.DB)
	batches, err := repo.GetAllBatches(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch batches"})
	}
	return c.JSON(batches)
}

// AddBatch adds a new batch
// @Summary Add Batch
// @Tags Config
// @Accept json
// @Produce json
// @Param batch body models.Batch true "Batch Data"
// @Success 201 {object} map[string]interface{}
// @Router /v1/admin/config/batches [post]
func AddBatch(c *fiber.Ctx) error {
	var input models.Batch
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewConfigRepository(database.DB)
	if err := repo.CreateBatch(c.Context(), input.Year); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create batch", "details": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"message": "Batch added successfully"})
}

// DeleteBatch removes a batch
// @Summary Remove Batch
// @Tags Config
// @Param id path int true "Batch ID"
// @Success 200 {object} map[string]interface{}
// @Router /v1/admin/config/batches/{id} [delete]
func DeleteBatch(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	repo := repository.NewConfigRepository(database.DB)
	if err := repo.DeleteBatch(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete batch", "details": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Batch deleted"})
}

// UpdateBatch updates a batch
// @Summary Update Batch
// @Tags Config
// @Accept json
// @Produce json
// @Param id path int true "Batch ID"
// @Param batch body models.Batch true "Batch Data"
// @Success 200 {object} map[string]interface{}
// @Router /v1/admin/config/batches/{id} [put]
func UpdateBatch(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	var input models.Batch
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewConfigRepository(database.DB)
	if err := repo.UpdateBatch(c.Context(), id, input.Year); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update batch", "details": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Batch updated successfully"})
}
