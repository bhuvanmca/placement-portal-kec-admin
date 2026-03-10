package main

import (
	"context"
	"log"
	"os"

	"time"

	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/handlers"
	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/middleware"
	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/repository"
	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../backend/.env"); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Database Connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v", err)
	}

	// Performance tuning for production
	config.MaxConns = 50
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30

	// persistence search_path for ALL connections in the pool
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO chat, public")
		return err
	}

	dbPool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(context.Background()); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}

	log.Println("Connected to Database for Chat Service (with persistent search_path)")

	// Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "KEC Placement Chat Service",
	})

	// Prometheus Monitoring
	prometheus := fiberprometheus.New("chat-service")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	// Middleware
	app.Use(logger.New())
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// Initialize Repository and Handler
	chatRepo := repository.NewChatRepository(dbPool)

	// Run Migration
	if err := chatRepo.Migrate(context.Background()); err != nil {
		log.Printf("Warning: Database migration failed: %v", err)
	}

	chatHandler := handlers.NewChatHandler(chatRepo)

	// WebSocket Hub
	hub := handlers.NewHub(chatRepo)
	go hub.Run()

	// Routes
	api := app.Group("/api/chat")

	// Apply Auth Middleware to all API routes
	api.Use(middleware.Protected())

	api.Get("/groups", chatHandler.GetGroups)
	api.Post("/groups", chatHandler.CreateGroup)
	api.Get("/users/chat-eligible", chatHandler.GetPotentialUsers)
	api.Get("/groups/:groupId/messages", chatHandler.GetHistory)
	api.Post("/messages/:msgId/pin", chatHandler.PinMessage)
	api.Delete("/messages/:msgId", chatHandler.DeleteMessage)
	api.Post("/broadcast", handlers.BroadcastMessage)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "Chat Service is running"})
	})

	// WebSocket Route
	app.Get("/ws", handlers.ServeWs(hub))

	// Start Server
	port := os.Getenv("CHAT_PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Chat Service listening on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
