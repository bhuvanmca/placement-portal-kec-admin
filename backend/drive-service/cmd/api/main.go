package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/drive-service/internal/handlers"
	"github.com/placement-portal-kec/drive-service/internal/repository"
	"github.com/placement-portal-kec/drive-service/internal/routes"
	"github.com/placement-portal-kec/drive-service/internal/services"
)

func main() {
	// 1. Initialize DB Connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://admin:admin123@localhost:5432/placement_portal?sslmode=disable"
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v", err)
	}

	config.MaxConns = 15
	config.MinConns = 2
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30

	db, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(context.Background()); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}

	log.Println("Connected to Database for Drive Service")

	// Initialize Redis Cache
	services.InitRedis()

	driveRepo := repository.NewDriveRepository(db)
	driveHandler := handlers.NewDriveHandler(driveRepo)

	// 3. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Placement Portal - Drive Service",
	})

	// 4. Middlewares
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000", // Update with frontend origin
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// 5. Setup Routes
	routes.SetupDriveRoutes(app, driveHandler)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Drive Service is running"})
	})

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083" // Drive service runs on 8083 per implementation plan
	}

	log.Printf("Starting Drive Service on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
