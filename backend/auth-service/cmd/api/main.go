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
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/auth-service/internal/routes"
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

	config.MaxConns = 50
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30

	// persistence search_path for ALL connections in the pool
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO auth, public")
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

	log.Println("Connected to Database for Auth Service (with persistent search_path)")

	// 2. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Placement Portal - Auth Service",
	})

	// Prometheus Monitoring
	prometheus := fiberprometheus.New("auth-service")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	// 3. Middlewares
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

	// 4. Setup Routes
	routes.SetupRoutes(app, db)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Auth Service is running"})
	})

	// 5. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081" // Auth service runs on 8081, while monolith runs on 8080
	}

	log.Printf("Starting Auth Service on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
