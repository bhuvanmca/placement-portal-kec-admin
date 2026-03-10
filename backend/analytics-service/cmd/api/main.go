package main

import (
	"fmt"
	"log"
	"os"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/placement-portal-kec/analytics-service/internal/database"
	"github.com/placement-portal-kec/analytics-service/internal/middleware"
	"github.com/placement-portal-kec/analytics-service/internal/routes"
)

func main() {
	middleware.SecretKey = []byte(os.Getenv("JWT_SECRET"))

	pool, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	fmt.Println("Analytics Service connected to database")

	app := fiber.New(fiber.Config{
		AppName: "Placement Portal - Analytics Service",
	})

	// Prometheus Monitoring
	prometheus := fiberprometheus.New("analytics-service")
	prometheus.RegisterAt(app, "/metrics")
	app.Use(prometheus.Middleware)

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path} | ${error}\n",
	}))

	routes.SetupRoutes(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8086"
	}
	log.Fatal(app.Listen(":" + port))
}
