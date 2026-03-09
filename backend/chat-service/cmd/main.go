package main

import (
	"context"
	"log"
	"os"

	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/handlers"
	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/middleware"
	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/repository"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
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

	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	// Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "KEC Placement Chat Service",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
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
