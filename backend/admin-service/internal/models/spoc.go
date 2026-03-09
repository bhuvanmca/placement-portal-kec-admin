package models

import "time"

// Spoc represents a Single Point of Contact
type Spoc struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Designation  string    `json:"designation"`
	MobileNumber string    `json:"mobile_number"`
	Email        string    `json:"email"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// DriveSpoc represents the link between a Drive and a SPOC
type DriveSpoc struct {
	DriveID          int64 `json:"drive_id"`
	SpocID           int64 `json:"spoc_id"`
	IsPrimaryContact bool  `json:"is_primary_contact"`
}

type CreateSpocInput struct {
	Name         string `json:"name" validate:"required"`
	Designation  string `json:"designation" validate:"required"`
	MobileNumber string `json:"mobile_number" validate:"required"`
	Email        string `json:"email" validate:"required,email"`
}
