package main

import (
	"fmt"
	"log"
	"os"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/middleware"
	"github.com/placement-portal-kec/admin-service/internal/routes"
	"github.com/placement-portal-kec/admin-service/internal/services"
)

func main() {
	// Initialize JWT Secret
	middleware.SecretKey = []byte(os.Getenv("JWT_SECRET"))

	// Connect to Database
	pool, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	fmt.Println("Admin Service connected to database")

	// Initialize Redis Cache
	services.InitRedis()

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		AppName:   "Placement Portal - Admin Service",
		BodyLimit: 50 * 1024 * 1024, // 50MB for file uploads & bulk operations
	})

	// Prometheus Monitoring
	prometheus := fiberprometheus.New("admin-service")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	app.Use(cors.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path} | ${error}\n",
	}))

	// Setup Routes
	routes.SetupRoutes(app)

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}
	log.Fatal(app.Listen(":" + port))
}
