package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/drive-service/internal/handlers"
	"github.com/placement-portal-kec/drive-service/internal/middleware"
)

func SetupDriveRoutes(router fiber.Router, driveHandler *handlers.DriveHandler) {
	api := router.Group("/api/v1")

	// Student Routes
	studentGroup := api.Group("/drives")
	studentGroup.Use(middleware.JWTMiddleware())

	studentGroup.Get("/", driveHandler.GetDrivesForStudent)
	studentGroup.Post("/:id/apply", driveHandler.ApplyForDrive)
	studentGroup.Post("/:id/opt-out", driveHandler.OptOutDrive)
	studentGroup.Get("/applications", driveHandler.GetStudentApplications)

	// Admin / Coord routes (requires roles)
	adminGroup := api.Group("/admin/drives")
	adminGroup.Use(middleware.JWTMiddleware())
	adminGroup.Use(middleware.RoleMiddleware("admin", "coordinator"))

	adminGroup.Post("/", driveHandler.CreateDrive)
	adminGroup.Get("/", driveHandler.GetAllDrives) // Change from /all to /
	adminGroup.Get("/:id", driveHandler.GetDriveByID)
	adminGroup.Put("/:id", driveHandler.UpdateDrive)        // Full update
	adminGroup.Patch("/:id", driveHandler.PatchDriveStatus) // Status only
	adminGroup.Delete("/:id", driveHandler.DeleteDrive)     // Soft delete

	// Applicant Management
	adminGroup.Get("/:id/applicants/detailed", driveHandler.GetApplicants)
	adminGroup.Post("/:id/export", driveHandler.ExportApplicants)         // Change to /export to match frontend
	adminGroup.Post("/:id/add-student", driveHandler.AdminAddApplication) // Change to /add-student to match frontend
	adminGroup.Delete("/:id/applications/:studentId", driveHandler.AdminRemoveApplication)

	// Eligibility Preview
	adminGroup.Post("/eligibility-preview", driveHandler.EligibilityPreview)
}
