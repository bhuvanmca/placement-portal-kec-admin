package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5"
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
		dbURL = "postgres://admin:admin123@localhost:5432/kecdrives-db?sslmode=disable"
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30

	// persistence search_path for ALL connections in the pool
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO drive, public")
		return err
	}

	var db *pgxpool.Pool

	// Retry loop for initial connection
	for i := 0; i < 10; i++ {
		db, err = pgxpool.NewWithConfig(context.Background(), config)
		if err == nil {
			if err = db.Ping(context.Background()); err == nil {
				break
			}
		}
		log.Printf("Waiting for database... retry %d/10", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Unable to connect to database after retries: %v", err)
	}
	defer db.Close()

	log.Println("Connected to Database for Drive Service (with persistent search_path)")

	// Initialize Redis Cache
	services.InitRedis()

	driveRepo := repository.NewDriveRepository(db)
	driveHandler := handlers.NewDriveHandler(driveRepo)

	// 3. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName:   "Placement Portal - Drive Service",
		BodyLimit: 50 * 1024 * 1024, // 50MB for file uploads
	})

	// Prometheus Monitoring
	prometheus := fiberprometheus.New("drive-service")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	// 4. Middlewares
	app.Use(recover.New())
	app.Use(logger.New())

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
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
