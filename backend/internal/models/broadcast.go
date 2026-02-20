package models

import (
	"encoding/json"
	"time"
)

type BroadcastTemplate struct {
	ID        int64           `json:"id" db:"id"`
	Name      string          `json:"name" db:"name"`
	Type      string          `json:"type" db:"type"` // WHATSAPP, EMAIL
	Content   string          `json:"content" db:"content"`
	Variables json.RawMessage `json:"variables" db:"variables"` // JSON array of strings
	CreatedBy *int64          `json:"created_by" db:"created_by"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}
