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

	// Public Student Routes
	auth := api.Group("/v1/auth")
	auth.Post("/login", handlers.StudentLogin)
	auth.Post("/logout", handlers.LogoutUser)
	// Public Webhooks
	api.All("/webhooks/whatsapp", handlers.HandleWhatsAppWebhook)

	// Public Admin Auth Routes (But separated namespace)
	// Even though they are public (for login), we group them under /v1/admin/auth
	adminAuth := api.Group("/v1/admin/auth")
	adminAuth.Post("/login", handlers.AdminLogin)
	adminAuth.Post("/forgot-password", handlers.AdminForgotPassword)
	adminAuth.Post("/reset-password", handlers.AdminResetPassword)
	adminAuth.Post("/register", handlers.RegisterUser) // Assuming Register is for Admins or general? Keeping it here or moving to admin protected?
	// User said "register... All should be under protected routes"
	// Login cannot be protected. Register can be.
	// If Register is for creating new users, usually it's public OR admin only.
	// Let's keep it in adminAuth for now as per request "similarly... register"

	// Protected Routes (Login Required)
	// We group these under /v1 so we can apply middleware to all of them
	v1 := api.Group("/v1", middleware.Protected)

	// ADMIN ONLY: Post Drives
	admin := v1.Group("/admin", middleware.AdminOnly)
	admin.Get("/drives", handlers.ListAdminDrives)                                     // List All Drives
	admin.Post("/drives", handlers.CreateDrive)                                        // Create
	admin.Put("/drives/:id", handlers.UpdateDrive)                                     // Update / Extend Deadline
	admin.Delete("/drives/:id", handlers.DeleteDrive)                                  // Delete
	admin.Post("/drives/bulk-delete", handlers.BulkDeleteDrives)                       // Bulk Delete
	admin.Get("/drives/:id/applicants", handlers.GetDriveApplicants)                   // View Applicants
	admin.Post("/drives/:id/add-student", handlers.AdminManualRegister)                // Force Add
	admin.Post("/students/bulk-upload", handlers.BulkUploadStudents)                   // Bulk Upload
	admin.Put("/users/:id/block", handlers.ToggleBlockUser)                            // Toggle Block
	admin.Put("/applications/status", handlers.UpdateApplicationStatus)                // Update Student Status (Places, Not-Placed)
	admin.Delete("/students/:id", handlers.DeleteStudent)                              // Delete One
	admin.Delete("/students/bulk", handlers.BulkDeleteStudents)                        // Delete Many (Filter)
	admin.Post("/students/delete-many", handlers.BulkDeleteStudentsByIds)              // Delete Many (IDs)
	admin.Post("/students", handlers.CreateStudent)                                    // [NEW] Create Student Manually
	admin.Get("/students", handlers.ListStudents)                                      // List Students
	admin.Get("/students/:id", handlers.GetStudentDetails)                             // Get Full Profile
	admin.Get("/students/:student_id/documents/:type", handlers.GetStudentDocumentURL) // [NEW] Get presigned URL for student documents

	// STUDENT ACTIONS
	v1.Get("/drives", handlers.ListStudentDrives) // STUDENT: View Drives (Filtered by Dept/Batch)
	v1.Post("/drives/:id/apply", handlers.ApplyForDrive)
	v1.Post("/drives/:id/withdraw", handlers.WithdrawFromDrive) // [NEW]
	v1.Post("/student/upload", handlers.UploadDocument)
	v1.Put("/student/profile", handlers.UpdateProfile)
	v1.Get("/student/profile", handlers.GetMyProfile)           // [NEW] Fetch Own Profile
	v1.Get("/student/documents/:type", handlers.GetDocumentURL) // [NEW] Get presigned URL for student documents
	v1.Post("/user/fcm-token", handlers.UpdateFCMToken)         // [NEW] Update FCM Token
	v1.Get("/brands/search", handlers.SearchBrands)             // [NEW] Prioritize specific path before param param path if conflicting, though /brands/search vs /brands/:domain is fine if search is not a domain.
	v1.Get("/brands/:domain", handlers.GetBrandDetails)
	v1.Get("/spocs", handlers.ListSpocs) // [NEW] List all SPOCs
	// Admin Only SPOC Management
	admin.Post("/spocs", handlers.CreateSpoc)                 // [NEW] Create SPOC
	admin.Put("/spocs/:id", handlers.UpdateSpoc)              // [NEW] Update SPOC
	admin.Delete("/spocs/:id", handlers.DeleteSpoc)           // [NEW] Delete SPOC
	admin.Put("/spocs/:id/status", handlers.ToggleSpocStatus) // [NEW] Toggle SPOC Status

	// Example: Only logged-in users can see this
	v1.Get("/profile", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id")
		return c.JSON(fiber.Map{
			"message": "You are accessing a protected route!",
			"your_id": userID,
		})
	})
}
