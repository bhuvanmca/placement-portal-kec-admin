package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/handlers"
	"github.com/placement-portal-kec/admin-service/internal/middleware"
	"github.com/placement-portal-kec/admin-service/internal/repository"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Admin Service is running"})
	})

	// Public Settings (no auth needed)
	systemSettingsHandler := handlers.NewSystemSettingsHandler(database.DB)
	app.Get("/api/v1/settings", systemSettingsHandler.GetSettings)

	api := app.Group("/api/v1", middleware.Protected)

	// --- Protected but available to all logged-in users ---
	api.Get("/config/departments", handlers.GetDepartments)
	api.Get("/config/batches", handlers.GetBatches)
	api.Get("/spocs", handlers.ListSpocs)
	api.Get("/brands/search", handlers.SearchBrands)
	api.Get("/brands/:domain", handlers.GetBrandDetails)

	// User Account Management (Generic for all roles)
	api.Get("/user/account", systemSettingsHandler.GetAccount)
	api.Put("/user/account", systemSettingsHandler.UpdateAccount)
	api.Put("/user/password", systemSettingsHandler.ChangePassword)
	api.Delete("/user/account", systemSettingsHandler.DeleteAccount)

	// --- Admin Only ---
	admin := api.Group("/admin", middleware.AdminOnly)

	// Student Management
	admin.Post("/students/bulk-upload", handlers.BulkUploadStudents)
	admin.Post("/students", handlers.CreateStudent)
	admin.Get("/students", handlers.ListStudents)
	admin.Get("/students/:id", handlers.GetStudentDetails)
	admin.Delete("/students/:id", handlers.DeleteStudent)
	admin.Delete("/students/bulk", handlers.BulkDeleteStudents)
	admin.Post("/students/delete-many", handlers.BulkDeleteStudentsByIds)
	admin.Put("/users/:id/block", handlers.ToggleBlockUser)
	admin.Get("/drive-requests", handlers.GetDriveRequests)
	admin.Put("/applications/status", handlers.UpdateApplicationStatus)
	admin.Put("/applications/bulk-status", handlers.BulkUpdateDriveRequestStatus)

	// System Monitoring
	admin.Get("/system/storage", handlers.GetStorageInfo)
	admin.Get("/archive/placements", handlers.ArchivePlacementRecords)

	// Garage Storage Admin
	admin.Get("/storage/objects", handlers.ListGarageObjects)
	admin.Get("/storage/chat-objects", handlers.ListChatBucketObjects)
	admin.Get("/storage/object", handlers.GetGarageObject)
	admin.Get("/storage/download", handlers.DownloadGarageObject)
	admin.Delete("/storage/object", handlers.DeleteGarageObject)
	admin.Post("/storage/bulk-delete", handlers.BulkDeleteGarageObjects)
	admin.Post("/storage/download-zip", handlers.DownloadGarageZip)
	admin.Post("/storage/download-archive", handlers.DownloadGarageArchive)

	// SPOCs Management
	admin.Post("/spocs", handlers.CreateSpoc)
	admin.Put("/spocs/:id", handlers.UpdateSpoc)
	admin.Delete("/spocs/:id", handlers.DeleteSpoc)
	admin.Put("/spocs/:id/status", handlers.ToggleSpocStatus)

	// Config Management
	admin.Post("/config/departments", handlers.AddDepartment)
	admin.Put("/config/departments/:id", handlers.UpdateDepartment)
	admin.Delete("/config/departments/:id", handlers.DeleteDepartment)
	admin.Post("/config/batches", handlers.AddBatch)
	admin.Put("/config/batches/:id", handlers.UpdateBatch)
	admin.Delete("/config/batches/:id", handlers.DeleteBatch)

	// Field Permissions & Requests
	permRepo := repository.NewPermissionRepository(database.DB)
	studentRepo := repository.NewStudentRepository(database.DB)
	settingsHandler := handlers.NewSettingsHandler(permRepo, studentRepo)

	requestRepo := repository.NewRequestRepository(database.DB)
	requestHandler := handlers.NewRequestHandler(requestRepo, studentRepo)

	broadcastRepo := repository.NewBroadcastRepository(database.DB)
	broadcastHandler := handlers.NewBroadcastHandler(broadcastRepo)

	eligibilityRepo := repository.NewEligibilityRepository(database.DB)
	eligibilityHandler := handlers.NewEligibilityHandler(eligibilityRepo)

	admin.Get("/settings/fields", settingsHandler.GetFieldPermissions)
	admin.Put("/settings/fields/:name", settingsHandler.ToggleFieldPermission)
	admin.Post("/settings", systemSettingsHandler.UpdateSettings)

	admin.Get("/requests", requestHandler.GetPendingRequests)
	admin.Put("/requests/:id", requestHandler.ReviewRequest)

	// Broadcast
	broadcast := admin.Group("/broadcast")
	broadcast.Post("/template", broadcastHandler.CreateTemplate)
	broadcast.Get("/template", broadcastHandler.GetTemplates)
	broadcast.Delete("/template/:id", broadcastHandler.DeleteTemplate)
	broadcast.Post("/send", broadcastHandler.SendBroadcast)

	// Eligibility Templates
	eligibility := admin.Group("/eligibility-templates")
	eligibility.Get("/", eligibilityHandler.ListTemplates)
	eligibility.Post("/", eligibilityHandler.CreateTemplate)
	eligibility.Get("/:id", eligibilityHandler.GetTemplate)
	eligibility.Put("/:id", eligibilityHandler.UpdateTemplate)
	eligibility.Delete("/:id", eligibilityHandler.DeleteTemplate)

	// --- Super Admin Only ---
	superAdmin := api.Group("/super-admin", middleware.SuperAdminOnly)
	superAdmin.Get("/users", handlers.ListManagedUsers)
	superAdmin.Post("/users", handlers.CreateManagedUser)
	superAdmin.Put("/users/:id", handlers.UpdateManagedUser)
	superAdmin.Delete("/users/:id", handlers.DeleteManagedUser)
	superAdmin.Get("/users/:id/permissions", handlers.GetUserPermissions)
	superAdmin.Put("/users/:id/permissions", handlers.UpdateUserPermissions)
	superAdmin.Get("/activity-log", handlers.GetActivityLog)
	superAdmin.Get("/permissions", handlers.GetAllPermissionKeys)
	superAdmin.Get("/departments", handlers.GetDepartmentsList)
	superAdmin.Post("/upload/college-logo", handlers.UploadCollegeLogo)
}
