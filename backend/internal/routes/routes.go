package routes

import (
	"github.com/SysSyncer/placement-portal-kec/internal/handlers"
	"github.com/SysSyncer/placement-portal-kec/internal/middleware"
	"github.com/gofiber/fiber/v2"

	_ "github.com/SysSyncer/placement-portal-kec/docs"
	"github.com/gofiber/swagger"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/swagger/*", swagger.HandlerDefault)

	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "success"})
	})

	// Public Routes (No Login Required)
	auth := api.Group("/auth")
	auth.Post("/register", handlers.RegisterUser)
	auth.Post("/login", handlers.LoginUser)
	auth.Post("/forgot-password", handlers.ForgotPassword)
	auth.Post("/reset-password", handlers.ResetPassword)
	auth.Post("/logout", handlers.LogoutUser)

	// Protected Routes (Login Required)
	// We group these under /v1 so we can apply middleware to all of them
	v1 := api.Group("/v1", middleware.Protected)

	// STUDENT & ADMIN: View Drives
	v1.Get("/drives", handlers.ListDrives)

	// ADMIN ONLY: Post Drives
	admin := v1.Group("/admin", middleware.AdminOnly)
	admin.Post("/drives", handlers.CreateDrive)                         // Create
	admin.Put("/drives/:id", handlers.UpdateDrive)                      // Update / Extend Deadline
	admin.Delete("/drives/:id", handlers.DeleteDrive)                   // Delete
	admin.Post("/drives/:id/add-student", handlers.AdminManualRegister) // Force Add
	admin.Post("/students/bulk-upload", handlers.BulkUploadStudents)    // Bulk Upload
	admin.Put("/users/:id/block", handlers.ToggleBlockUser)             // Toggle Block
	admin.Put("/applications/status", handlers.UpdateApplicationStatus) // Update Student Status (Places, Not-Placed)
	admin.Delete("/students/:id", handlers.DeleteStudent)               // Delete One
	admin.Delete("/students/bulk", handlers.BulkDeleteStudents)         // Delete Many
	admin.Get("/students", handlers.ListStudents)                       // List Students

	// STUDENT ACTIONS
	v1.Post("/drives/:id/apply", handlers.ApplyForDrive)
	v1.Post("/student/upload", handlers.UploadDocument)
	v1.Put("/student/profile", handlers.UpdateProfile)

	// Example: Only logged-in users can see this
	v1.Get("/profile", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id")
		return c.JSON(fiber.Map{
			"message": "You are accessing a protected route!",
			"your_id": userID,
		})
	})
}
