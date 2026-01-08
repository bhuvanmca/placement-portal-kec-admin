package models

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype" // Driver-specific types for robust handling
)

type PlacementDrive struct {
	ID             int64  `json:"id"`
	PostedBy       int64  `json:"posted_by"`
	CompanyName    string `json:"company_name"`
	JobRole        string `json:"job_role"`
	JobDescription string `json:"job_description"`
	Location       string `json:"location"`

	// Filters & Categories
	DriveType       string `json:"drive_type"`       // 'Full-Time', 'Internship', 'Freelance', 'Internship to Full-Time'
	CompanyCategory string `json:"company_category"` // 'Core', 'IT', 'Service', 'Product', 'Non-Core'
	DriveObjective  string `json:"drive_objective"`

	// Financials (Crucial: Input as numbers, Display as string)
	CtcMin     int64  `json:"ctc_min"`     // 400000
	CtcMax     int64  `json:"ctc_max"`     // 600000
	CtcDisplay string `json:"ctc_display"` // "4L - 6L PA"

	// Eligibility (Stored as standard Go types)
	MinCgpa            float64 `json:"min_cgpa"`
	MaxBacklogsAllowed int     `json:"max_backlogs_allowed"`

	// Dates
	DriveDate    pgtype.Date `json:"drive_date" swaggertype:"string" example:"2026-05-20"` // Special handling for pure dates
	DeadlineDate time.Time   `json:"deadline_date"`
	Status       string      `json:"status"`

	CreatedAt time.Time `json:"created_at"`
}

// Input struct for Creating a Drive (What the Admin sends)
type CreateDriveInput struct {
	CompanyName        string  `json:"company_name" validate:"required"`
	JobRole            string  `json:"job_role" validate:"required"`
	JobDescription     string  `json:"job_description"`
	Location           string  `json:"location"`
	DriveType          string  `json:"drive_type"`
	CompanyCategory    string  `json:"company_category"`
	CtcMin             int64   `json:"ctc_min"`
	CtcMax             int64   `json:"ctc_max"`
	CtcDisplay         string  `json:"ctc_display"`
	MinCgpa            float64 `json:"min_cgpa"`
	MaxBacklogsAllowed int     `json:"max_backlogs_allowed"`
	DriveDate          string  `json:"drive_date"` // "2026-05-20"
	DeadlineDate       string  `json:"deadline_date"`
}

// ManualRegisterInput defines the input for admin adding a student to a drive
type ManualRegisterInput struct {
	StudentID int64 `json:"student_id"`
}
