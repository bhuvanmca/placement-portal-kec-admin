package worker

import (
	"context"
	"log"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/database"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
)

// StartScheduler initializes background tasks
func StartScheduler() {
	// Create a Ticker that ticks every 1 minute
	ticker := time.NewTicker(5 * time.Minute)

	// Run in a separate Goroutine so it doesn't block your API
	go func() {
		for range ticker.C {
			// Every minute, this code runs
			closeExpiredDrives()
			cleanupOTPs()
		}
	}()

	log.Println("Background Scheduler Started: Checking for expired drives every minute...")
	log.Println("Background Scheduler Started: Managing Drives & OTPs...")
}

func closeExpiredDrives() {
	// Create a temporary context with a timeout (safety first!)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	repo := repository.NewDriveRepository(database.DB)

	count, err := repo.AutoCloseExpiredDrives(ctx)
	if err != nil {
		log.Printf("Error closing drives: %v\n", err)
		return
	}

	if count > 0 {
		log.Printf("Automatically closed %d expired drives.\n", count)
	}
}

// Helper function for OTP cleanup
func cleanupOTPs() {
	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	repo := repository.NewUserRepository(database.DB)

	count, err := repo.DeleteExpiredOTPs(ctx)
	if err != nil {
		log.Printf("️Error cleaning OTPs: %v\n", err)
		return
	}

	if count > 0 {
		log.Printf("Garbage Collector: Deleted %d expired OTPs.\n", count)
	}
}
