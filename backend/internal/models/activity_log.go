package models

import (
	"encoding/json"
	"time"
)

type ActivityLog struct {
	ID         int64           `json:"id"`
	UserID     int64           `json:"user_id"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Details    json.RawMessage `json:"details"`
	IPAddress  string          `json:"ip_address"`
	CreatedAt  time.Time       `json:"created_at"`

	// Joined Data
	UserName string `json:"user_name,omitempty"`
	UserRole string `json:"user_role,omitempty"`
}

type CreateActivityLogInput struct {
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Details    json.RawMessage `json:"details"`
}
