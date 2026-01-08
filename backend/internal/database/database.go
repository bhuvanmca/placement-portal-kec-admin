package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

// ConnectDB initializes the global PostgreSQL connection pool using the provided connection string.
//
// It parses the connection string to create a default configuration and applies specific
// tuning parameters for the connection pool:
//   - MaxConns: Limits the pool to 10 concurrent connections to prevent database overload.
//   - MinConns: Maintains at least 2 idle connections to reduce latency for new requests.
//   - MaxConnLifetime: Recycles connections every hour to prevent stale connection issues.
//
// After configuration, it attempts to establish the pool and verifies connectivity by
// pinging the database. If any step fails (parsing config, connecting, or pinging),
// the application will terminate immediately via log.Fatal.
func ConnectDB(connString string) {
	var err error

	// Config for connection pool (optional tweaking usually goes here)
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		log.Fatal("Failed to parse DB config:", err)
	}

	// Set constraints to prevent resource starvation
	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = time.Hour

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

	fmt.Println("Connected to PostgreSQL successfully!")
}

// CloseDB closes the connection pool
func CloseDB() {
	if DB != nil {
		DB.Close()
		fmt.Println("Database connection closed.")
	}
}
