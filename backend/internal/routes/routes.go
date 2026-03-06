package routes

import (
	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/handlers"
	"github.com/SysSyncer/placement-portal-kec/internal/middleware"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"

	_ "github.com/SysSyncer/placement-portal-kec/docs"
	"github.com/gofiber/swagger"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/swagger/*", swagger.HandlerDefault)

	api := app.Group("/api")

	api.Get("/health", handlers.GetSystemHealth)

	// Public Student Routes
	auth := api.Group("/v1/auth")
	auth.Post("/login", handlers.StudentLogin)
	auth.Post("/logout", handlers.LogoutUser)
	auth.Post("/forgot-password", handlers.StudentForgotPassword) // [NEW]
	auth.Post("/reset-password", handlers.StudentResetPassword)   // [NEW]
	// Public Webhooks
	// Public Webhooks

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
	admin.Get("/drives", handlers.ListAdminDrives)                                           // List All Drives
	admin.Post("/drives", handlers.CreateDrive)                                              // Create
	admin.Put("/drives/:id", handlers.UpdateDrive)                                           // Update / Extend Deadline
	admin.Patch("/drives/:id", handlers.PatchDrive)                                          // Selective Patch
	admin.Delete("/drives/:id", handlers.DeleteDrive)                                        // Delete
	admin.Post("/drives/bulk-delete", handlers.BulkDeleteDrives)                             // Bulk Delete
	admin.Get("/drives/:id/applicants", handlers.GetDriveApplicants)                         // View Applicants
	admin.Get("/drives/:id/applicants/detailed", handlers.GetDriveApplicantsDetailedHandler) // [NEW] View Detailed Applicants
	admin.Post("/drives/:id/export", handlers.ExportDriveApplicants)                         // [NEW] Export Applicants
	admin.Post("/drives/:id/add-student", handlers.AdminManualRegister)                      // Force Add
	admin.Post("/students/bulk-upload", handlers.BulkUploadStudents)                         // Bulk Upload
	admin.Put("/users/:id/block", handlers.ToggleBlockUser)                                  // Toggle Block
	admin.Put("/applications/status", handlers.UpdateApplicationStatus)                      // Update Student Status (Places, Not-Placed)
	admin.Put("/applications/bulk-status", handlers.BulkUpdateDriveRequestStatus)            // [NEW] Bulk Approve/Reject
	admin.Post("/drives/eligibility-preview", handlers.EligibilityPreview)                   // [NEW] Preview Eligible Students
	admin.Get("/drive-requests", handlers.GetDriveRequests)                                  // [NEW] Get Pending Requests
	admin.Delete("/students/:id", handlers.DeleteStudent)                                    // Delete One
	admin.Delete("/students/bulk", handlers.BulkDeleteStudents)                              // Delete Many (Filter)
	admin.Post("/students/delete-many", handlers.BulkDeleteStudentsByIds)                    // Delete Many (IDs)
	admin.Post("/students", handlers.CreateStudent)                                          // [NEW] Create Student Manually
	admin.Get("/students", handlers.ListStudents)                                            // List Students
	admin.Get("/students/:id", handlers.GetStudentDetails)                                   // Get Full Profile
	admin.Get("/students/:student_id/documents/:type", handlers.GetStudentDocumentURL)       // [NEW] Get presigned URL for student documents

	// System Monitoring & Data Archival
	admin.Get("/system/storage", handlers.GetStorageInfo)              // [NEW] Get disk usage and storage stats
	admin.Get("/archive/placements", handlers.ArchivePlacementRecords) // [NEW] Download placement records as ZIP
	admin.Get("/analytics/dashboard", handlers.GetDashboardAnalytics)  // [NEW] Comprehensive analytics dashboard

	// Garage Storage Admin Panel
	admin.Get("/storage/objects", handlers.ListGarageObjects)               // [NEW] List all files in Garage
	admin.Get("/storage/chat-objects", handlers.ListChatBucketObjects)      // [NEW] List chat attachment files
	admin.Get("/storage/object", handlers.GetGarageObject)                  // [NEW] Get file metadata + download URL
	admin.Get("/storage/download", handlers.DownloadGarageObject)           // [NEW] Direct file download
	admin.Delete("/storage/object", handlers.DeleteGarageObject)            // [NEW] Delete single file
	admin.Post("/storage/bulk-delete", handlers.BulkDeleteGarageObjects)    // [NEW] Delete multiple files
	admin.Post("/storage/download-zip", handlers.DownloadGarageZip)         // [NEW] Download selected files as ZIP
	admin.Post("/storage/download-archive", handlers.DownloadGarageArchive) // [NEW] Download archive by year

	// STUDENT ACTIONS
	v1.Get("/drives", handlers.ListStudentDrives) // STUDENT: View Drives (Filtered by Dept/Batch)
	v1.Post("/drives/:id/apply", handlers.ApplyForDrive)
	v1.Post("/drives/:id/withdraw", handlers.WithdrawFromDrive)          // [NEW]
	v1.Post("/drives/:id/request-attend", handlers.RequestToAttendDrive) // [NEW] Request to attend (ineligible)
	v1.Post("/student/upload", handlers.UploadDocument)
	v1.Put("/student/profile", handlers.UpdateProfile)
	v1.Put("/student/password", handlers.ChangePassword)                 // [NEW] Change Password
	v1.Get("/student/profile", handlers.GetMyProfile)                    // [NEW] Fetch Own Profile
	v1.Get("/student/documents/:type", handlers.GetDocumentURL)          // [NEW] Get presigned URL for student documents
	v1.Post("/chat/upload", handlers.UploadChatAttachment)               // [NEW] Chat Attachment Upload
	v1.Post("/user/upload/profile-photo", handlers.UploadProfilePicture) // [NEW] Generic Profile Photo Upload
	v1.Post("/user/fcm-token", handlers.UpdateFCMToken)                  // [NEW] Update FCM Token
	v1.Get("/brands/search", handlers.SearchBrands)                      // [NEW] Prioritize specific path before param param path if conflicting, though /brands/search vs /brands/:domain is fine if search is not a domain.
	v1.Get("/brands/:domain", handlers.GetBrandDetails)
	v1.Get("/spocs", handlers.ListSpocs) // [NEW] List all SPOCs
	// Admin Only SPOC Management
	admin.Post("/spocs", handlers.CreateSpoc)                 // [NEW] Create SPOC
	admin.Put("/spocs/:id", handlers.UpdateSpoc)              // [NEW] Update SPOC
	admin.Delete("/spocs/:id", handlers.DeleteSpoc)           // [NEW] Delete SPOC
	admin.Put("/spocs/:id/status", handlers.ToggleSpocStatus) // [NEW] Toggle SPOC Status

	// Config Management (Departments & Batches)
	v1.Get("/config/departments", handlers.GetDepartments)
	v1.Get("/config/batches", handlers.GetBatches)

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

	// [NEW] Request & Broadcast Repos
	requestRepo := repository.NewRequestRepository(database.DB)
	broadcastRepo := repository.NewBroadcastRepository(database.DB)

	requestHandler := handlers.NewRequestHandler(requestRepo, studentRepo)
	broadcastHandler := handlers.NewBroadcastHandler(broadcastRepo)

	// Global System Settings (New)
	systemSettingsHandler := handlers.NewSystemSettingsHandler(database.DB)

	// Eligibility Templates (New)
	eligibilityRepo := repository.NewEligibilityRepository(database.DB)
	eligibilityHandler := handlers.NewEligibilityHandler(eligibilityRepo)

	// Public Settings (Accessible without token)
	api.Get("/v1/settings", systemSettingsHandler.GetSettings)

	// User Account Management (Generic for all roles)
	v1.Get("/user/account", systemSettingsHandler.GetAccount)
	v1.Put("/user/account", systemSettingsHandler.UpdateAccount)
	v1.Put("/user/password", systemSettingsHandler.ChangePassword) // [NEW] Change Password (Generic)
	v1.Delete("/user/account", systemSettingsHandler.DeleteAccount)

	// Student: Mark Update Request
	v1.Post("/student/request", requestHandler.CreateRequest)
	v1.Get("/student/requests", requestHandler.GetMyRequests)               // [NEW]
	v1.Get("/student/drive-requests", handlers.GetMyDriveRequests)          // [NEW] Student Drive Requests
	v1.Delete("/student/drive-requests/:id", handlers.DeleteMyDriveRequest) // [NEW] Soft-delete Drive Request
	v1.Delete("/student/requests/:id", requestHandler.DeleteMyRequest)      // [NEW] Soft-delete Change Request

	admin.Get("/settings/fields", settingsHandler.GetFieldPermissions)
	admin.Put("/settings/fields/:name", settingsHandler.ToggleFieldPermission)
	admin.Post("/settings", systemSettingsHandler.UpdateSettings) // Admin can update policy/profile

	// [UPDATED] Handling Requests via new RequestHandler
	admin.Get("/requests", requestHandler.GetPendingRequests)
	admin.Put("/requests/:id", requestHandler.ReviewRequest)

	// [NEW] Broadcast Module
	broadcast := admin.Group("/broadcast")
	broadcast.Post("/template", broadcastHandler.CreateTemplate)
	broadcast.Get("/template", broadcastHandler.GetTemplates)
	broadcast.Delete("/template/:id", broadcastHandler.DeleteTemplate)
	broadcast.Post("/send", broadcastHandler.SendBroadcast)

	// [NEW] Eligibility Templates
	eligibility := admin.Group("/eligibility-templates")
	eligibility.Get("/", eligibilityHandler.ListTemplates)
	eligibility.Post("/", eligibilityHandler.CreateTemplate)
	eligibility.Get("/:id", eligibilityHandler.GetTemplate)
	eligibility.Put("/:id", eligibilityHandler.UpdateTemplate)
	eligibility.Delete("/:id", eligibilityHandler.DeleteTemplate)

	// SUPER ADMIN ONLY: User Management
	superAdmin := v1.Group("/super-admin", middleware.SuperAdminOnly)
	superAdmin.Get("/users", handlers.ListManagedUsers)
	superAdmin.Post("/users", handlers.CreateManagedUser)
	superAdmin.Put("/users/:id", handlers.UpdateManagedUser)
	superAdmin.Delete("/users/:id", handlers.DeleteManagedUser)
	superAdmin.Get("/users/:id/permissions", handlers.GetUserPermissions)
	superAdmin.Put("/users/:id/permissions", handlers.UpdateUserPermissions)
	superAdmin.Get("/activity-log", handlers.GetActivityLog)
	superAdmin.Get("/permissions", handlers.GetAllPermissionKeys)
	superAdmin.Get("/departments", handlers.GetDepartmentsList)
	superAdmin.Post("/upload/college-logo", handlers.UploadCollegeLogo) // [NEW] College Logo Upload

	// Example: Only logged-in users can see this
	v1.Get("/profile", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id")
		return c.JSON(fiber.Map{
			"message": "You are accessing a protected route!",
			"your_id": userID,
		})
	})
}
