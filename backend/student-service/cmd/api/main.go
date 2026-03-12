package main

import (
	"fmt"
	"log"
	"os"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/placement-portal-kec/student-service/internal/database"
	"github.com/placement-portal-kec/student-service/internal/handlers"
	"github.com/placement-portal-kec/student-service/internal/repository"
	"github.com/placement-portal-kec/student-service/internal/routes"
	"github.com/placement-portal-kec/student-service/internal/services"
	"github.com/placement-portal-kec/student-service/internal/utils"
)

func main() {
	// Initialize JWT Secret
	utils.SecretKey = []byte(os.Getenv("JWT_SECRET"))

	// Connect to Database
	pool, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	fmt.Println("Student Service connected to database")

	// Initialize Redis Cache
	services.InitRedis()

	// Initialize Repositories
	studentRepo := repository.NewStudentRepository(pool)
	userRepo := repository.NewUserRepository(pool)
	requestRepo := repository.NewRequestRepository(pool)

	// Initialize Handler
	studentHandler := handlers.NewStudentHandler(studentRepo, userRepo, requestRepo)

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		AppName:   "Placement Portal - Student Service",
		BodyLimit: 10 * 1024 * 1024, // 10MB for uploads
	})

	// Prometheus Monitoring
	prometheus := fiberprometheus.New("student-service")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}

	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path} | ${error}\n",
	}))

	// Setup Routes
	routes.SetupRoutes(app, studentHandler)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Student Service is running"})
	})

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}
	log.Fatal(app.Listen(":" + port))
}
