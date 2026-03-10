package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

// ConnectDB initializes the global PostgreSQL connection pool using the provided connection string.
func ConnectDB(connString string) {
	var err error

	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		log.Fatal("Failed to parse DB config:", err)
	}

	// Performance tuning for production
	config.MaxConns = 50
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30
	config.HealthCheckPeriod = 1 * time.Minute

	// persistence search_path for ALL connections in the pool
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO drive, public")
		return err
	}

	// Establish connection
	DB, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatal("Unable to connect to database:", err)
	}

	// Test the connection
	err = DB.Ping(context.Background())
	if err != nil {
		log.Fatal("Could not ping database:", err)
	}

	fmt.Println("Connected to PostgreSQL successfully (with persistent search_path)!")
}

// CloseDB closes the connection pool
func CloseDB() {
	if DB != nil {
		DB.Close()
		fmt.Println("Database connection closed.")
	}
}
