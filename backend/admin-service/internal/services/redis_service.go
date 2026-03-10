package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// InitRedis connects to the Redis server and makes the client globally available
func InitRedis() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379" // Fallback for local dev avoiding IPv6 dial tcp [::1]:6379 error
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "", // No password set by default
		DB:       0,  // Use default DB
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := RedisClient.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Could not connect to Redis at %s: %v. Caching will be skipped.", redisAddr, err)
		RedisClient = nil // Keep it nil so we know it failed
	} else {
		log.Printf("Connected to Redis at %s", redisAddr)
	}
}

// GetCache retrieves and unmarshals data from Redis. Returns false if not found.
func GetCache(ctx context.Context, key string, dest interface{}) bool {
	if RedisClient == nil {
		return false
	}

	val, err := RedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return false // Cache miss
	} else if err != nil {
		fmt.Printf("Redis GET error for key %s: %v\n", key, err)
		return false
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		fmt.Printf("Redis Unmarshal error for key %s: %v\n", key, err)
		return false
	}

	return true
}

// SetCache marshals data and stores it in Redis with the given expiration.
func SetCache(ctx context.Context, key string, value interface{}, expiration time.Duration) {
	if RedisClient == nil {
		return
	}

	valBytes, err := json.Marshal(value)
	if err != nil {
		fmt.Printf("Redis Marshal error for key %s: %v\n", key, err)
		return
	}

	if err := RedisClient.Set(ctx, key, valBytes, expiration).Err(); err != nil {
		fmt.Printf("Redis SET error for key %s: %v\n", key, err)
	}
}

// InvalidateCache deletes a specific key.
func InvalidateCache(ctx context.Context, key string) {
	if RedisClient == nil {
		return
	}
	RedisClient.Del(ctx, key)
}

// InvalidateCacheByPrefix deletes all keys matching a specific pattern (e.g., "drives:*").
// Note: KEYS command can be slow on huge datasets. For a portal of this size, it is safe.
func InvalidateCacheByPrefix(ctx context.Context, prefix string) {
	if RedisClient == nil {
		return
	}

	keys, err := RedisClient.Keys(ctx, prefix+"*").Result()
	if err != nil {
		fmt.Printf("Redis KEYS error for prefix %s: %v\n", prefix, err)
		return
	}

	if len(keys) > 0 {
		if err := RedisClient.Del(ctx, keys...).Err(); err != nil {
			fmt.Printf("Redis bulk DEL error for prefix %s: %v\n", prefix, err)
		} else {
			fmt.Printf("Invalidated %d cache keys matching '%s*'\n", len(keys), prefix)
		}
	}
}
