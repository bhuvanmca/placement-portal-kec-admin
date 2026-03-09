package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/analytics-service/internal/handlers"
	"github.com/placement-portal-kec/analytics-service/internal/middleware"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Analytics Service is running"})
	})

	api := app.Group("/api/v1", middleware.Protected)
	admin := api.Group("/admin", middleware.AdminOnly)

	admin.Get("/analytics/dashboard", handlers.GetDashboardAnalytics)
}
