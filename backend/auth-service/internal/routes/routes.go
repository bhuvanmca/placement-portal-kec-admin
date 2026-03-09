package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/auth-service/internal/handlers"
	"github.com/placement-portal-kec/auth-service/internal/repository"
)

// SetupRoutes configures the API routes for the auth service
func SetupRoutes(app *fiber.App, db *pgxpool.Pool) {
	// Initialize Dependencies
	authRepo := repository.NewAuthRepository(db)
	authHandler := handlers.NewAuthHandler(authRepo)

	// API Group
	api := app.Group("/api/v1/auth")

	// Public Routes
	api.Post("/register", authHandler.RegisterUser)
	api.Post("/login", authHandler.Login)
}
