package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/student-service/internal/handlers"
	"github.com/placement-portal-kec/student-service/internal/middleware"
)

func SetupRoutes(app *fiber.App, h *handlers.StudentHandler) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Student Service is running"})
	})

	api := app.Group("/api/v1", middleware.Protected)

	// Student Profile
	api.Get("/student/profile", h.GetMyProfile)
	api.Put("/student/profile", h.UpdateProfile)
	api.Put("/student/password", h.ChangePassword)

	// Documents
	api.Get("/student/documents/:type", h.GetDocumentURL)
	api.Post("/student/upload", h.UploadDocument)

	// Generic User Actions
	api.Post("/user/upload/profile-photo", h.UploadProfilePicture)
	api.Post("/user/fcm-token", h.UpdateFCMToken)
	api.Post("/chat/upload", h.UploadChatAttachment)

	// Student Change Requests
	api.Post("/student/request", h.CreateRequest)
	api.Get("/student/requests", h.GetMyRequests)
	api.Delete("/student/requests/:id", h.DeleteMyRequest)

	// Admin-only routes
	admin := api.Group("/admin", middleware.AdminOnly)
	admin.Post("/students", h.CreateStudent)
	admin.Get("/students/:student_id/documents/:type", h.GetStudentDocumentURL)

	// Admin: Request Management
	admin.Get("/requests", h.GetPendingRequests)
	admin.Put("/requests/:id", h.ReviewRequest)
}
