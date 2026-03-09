package models

// User represents the minimal context needed by the Drive Service
// This is populated by the JWT parser middleware.
type User struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	IsBlocked bool   `json:"is_blocked"`
}
