package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadConfig() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}
}

func GetDBURL() string {
	return os.Getenv("DB_URL")
}

func GetJWTSecret() string {
	return os.Getenv("JWT_SECRET")
}
