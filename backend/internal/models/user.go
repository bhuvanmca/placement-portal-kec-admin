package models

import "time"

// User represents the distinct user entity in our system
type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`    // "json:-" ensures we NEVER send the password back to the frontend
	Role         string    `json:"role"` // 'student' or 'admin'
	IsActive     bool      `json:"is_active"`
	IsBlocked    bool      `json:"is_blocked"`
	CreatedAt    time.Time `json:"created_at"`
}

// RegisterInput defines what the frontend sends us to create a user
type RegisterInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=student admin"`
}

// LoginInput defines what the frontend sends to log in
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ForgotPasswordInput is the request body for initiating a password reset
type ForgotPasswordInput struct {
	Email string `json:"email"`
}

// ResetPasswordInput is the request body for completing a password reset
type ResetPasswordInput struct {
	Email       string `json:"email"`
	Otp         string `json:"otp"`
	NewPassword string `json:"new_password"`
}
