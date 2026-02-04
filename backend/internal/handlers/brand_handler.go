package handlers

import (
	"github.com/SysSyncer/placement-portal-kec/internal/utils"
	"github.com/gofiber/fiber/v2"
)

// GetBrandDetails fetches company info from Logo.dev API
// @Summary Get Brand Details
// @Description Fetch company details like logo and name from Logo.dev
// @Tags Brands
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param domain path string true "Company Domain (e.g. google.com)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/brands/{domain} [get]
func GetBrandDetails(c *fiber.Ctx) error {
	domain := c.Params("domain")
	if domain == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Domain is required"})
	}

	info, err := utils.FetchCompanyBrand(domain)
	if err != nil {
		// Return 404 if not found (or 500)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch brand details", "details": err.Error()})
	}

	return c.JSON(info)
}

// SearchBrands searches for companies using Logo.dev Brand Search API
// @Summary Search Brands
// @Description Search for companies/brands by name
// @Tags Brands
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param query query string true "Search Query"
// @Success 200 {array} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /v1/brands/search [get]
func SearchBrands(c *fiber.Ctx) error {
	query := c.Query("query")
	if query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query param is required"})
	}

	results, err := utils.SearchCompanies(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to search brands", "details": err.Error()})
	}

	return c.JSON(results)
}
