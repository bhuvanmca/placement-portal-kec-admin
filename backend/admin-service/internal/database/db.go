package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func Connect() (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database dsn: %w", err)
	}

	// Performance tuning for production
	config.MaxConns = 15
	config.MinConns = 3
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30

	// persistence search_path for ALL connections in the pool
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO admin, student, drive, auth, public")
		return err
	}

	var pool *pgxpool.Pool

	// Retry loop for initial connection
	for i := 0; i < 10; i++ {
		pool, err = pgxpool.NewWithConfig(context.Background(), config)
		if err == nil {
			if err = pool.Ping(context.Background()); err == nil {
				break
			}
		}
		log.Printf("Waiting for database... retry %d/10", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("unable to connect to database after retries: %w", err)
	}

	DB = pool
	return pool, nil
}
