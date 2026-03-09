package handlers

import (
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// GetDashboardAnalytics gets full dashboard placement statistics
// @Summary Get dashboard placement analytics
// @Description Calculates placement statistics across multiple dimensions (year, dept, gender, category, offer-type)
// @Tags Admin Analytics
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.DashboardAnalytics
// @Failure 500 {object} map[string]interface{}
// @Param timeframe query string false "Filter by timeframe: all_time, weekly, monthly, quarterly, half_yearly, annual"
// @Router /v1/admin/analytics/dashboard [get]
func GetDashboardAnalytics(c *fiber.Ctx) error {
	repo := repository.NewAnalyticsRepository(database.DB)
	timeframe := c.Query("timeframe", "all_time")

	analytics, err := repo.GetDashboardAnalytics(c.Context(), timeframe)
	if err != nil {
		fmt.Printf("Error fetching dashboard analytics: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve analytics data",
		})
	}

	return c.JSON(analytics)
}
