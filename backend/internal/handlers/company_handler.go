package handlers

import (
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

func CreateCompany(c *fiber.Ctx) error {
	var input models.CreateCompanyInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	visitDate, err := time.Parse("2006-01-02", input.VisitDate)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid date format. Use YYYY-MM-DD"})
	}

	company := models.Company{
		Name:                input.Name,
		VisitDate:           visitDate,
		Incharge:            input.Incharge,
		EligibleDepartments: input.EligibleDepartments,
		Salary:              input.Salary,
		Eligibility:         input.Eligibility,
		Remarks:             input.Remarks,
	}

	repo := repository.NewCompanyRepository(database.DB)
	if err := repo.Create(c.Context(), &company); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create company"})
	}

	return c.Status(201).JSON(company)
}

func GetAllCompanies(c *fiber.Ctx) error {
	repo := repository.NewCompanyRepository(database.DB)
	companies, err := repo.GetAll(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not fetch companies"})
	}

	return c.JSON(companies)
}

func UpdateCompany(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	var input models.CreateCompanyInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	visitDate, err := time.Parse("2006-01-02", input.VisitDate)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid date format. Use YYYY-MM-DD"})
	}

	company := models.Company{
		Name:                input.Name,
		VisitDate:           visitDate,
		Incharge:            input.Incharge,
		EligibleDepartments: input.EligibleDepartments,
		Salary:              input.Salary,
		Eligibility:         input.Eligibility,
		Remarks:             input.Remarks,
	}

	repo := repository.NewCompanyRepository(database.DB)
	if err := repo.Update(c.Context(), int64(id), &company); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update company"})
	}

	return c.JSON(fiber.Map{"message": "Company updated successfully"})
}

func UpdateCompanyChecklist(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	var input models.UpdateCompanyChecklistInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	repo := repository.NewCompanyRepository(database.DB)
	if err := repo.UpdateChecklist(c.Context(), int64(id), input.Checklist); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update checklist"})
	}

	return c.JSON(fiber.Map{"message": "Checklist updated successfully"})
}

func DeleteCompany(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	repo := repository.NewCompanyRepository(database.DB)
	if err := repo.Delete(c.Context(), int64(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not delete company"})
	}

	return c.JSON(fiber.Map{"message": "Company deleted successfully"})
}
