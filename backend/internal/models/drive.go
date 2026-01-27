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
	Website        string `json:"website"`  // [NEW]
	LogoURL        string `json:"logo_url"` // [NEW]

	// Filters & Categories
	DriveType       string `json:"drive_type"`       // 'Full-Time', 'Internship', 'Freelance', 'Part-Time'
	CompanyCategory string `json:"company_category"` // 'Core', 'IT', 'Service', 'Product', 'Start-up', 'MNC'
	SpocID          int64  `json:"spoc_id"`          // [NEW] Single Point Of Contact ID

	// Financials
	CtcMin     int64  `json:"ctc_min"`
	CtcMax     int64  `json:"ctc_max"`
	CtcDisplay string `json:"ctc_display"`
	StipendMin int64  `json:"stipend_min"`
	StipendMax int64  `json:"stipend_max"`

	// Eligibility
	MinCgpa float64 `json:"min_cgpa"`

	// Additional Academic Eligibility
	TenthPercentage     *float64 `json:"tenth_percentage"`
	TwelfthPercentage   *float64 `json:"twelfth_percentage"`
	UGMinCGPA           *float64 `json:"ug_min_cgpa"`
	PGMinCGPA           *float64 `json:"pg_min_cgpa"`
	UseAggregate        bool     `json:"use_aggregate"`
	AggregatePercentage *float64 `json:"aggregate_percentage"`

	MaxBacklogsAllowed  int      `json:"max_backlogs_allowed"`
	EligibleBatches     []int    `json:"eligible_batches"`     // JSONB
	EligibleDepartments []string `json:"eligible_departments"` // JSONB

	// Rounds
	Rounds      []Round      `json:"rounds"`      // JSONB
	Attachments []Attachment `json:"attachments"` // JSONB

	// Dates
	DriveDate    pgtype.Date `json:"drive_date" swaggertype:"string" example:"2026-05-20"`
	DeadlineDate time.Time   `json:"deadline_date"`
	Status       string      `json:"status"`

	CreatedAt      time.Time `json:"created_at"`
	ApplicantCount int       `json:"applicant_count"`       // [NEW] Computed field
	UserStatus     string    `json:"user_status,omitempty"` // [NEW] For student response ('opted_in', etc.)
}

type Round struct {
	Name        string `json:"name"`        // "Aptitude", "Technical", "HR"
	Date        string `json:"date"`        // "2026-05-21"
	Description string `json:"description"` // "Online test via Hackerearth"
}

type Attachment struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// Input struct for Creating a Drive
type CreateDriveInput struct {
	CompanyName     string `json:"company_name" validate:"required"`
	JobRole         string `json:"job_role" validate:"required"`
	JobDescription  string `json:"job_description"`
	Location        string `json:"location"`
	Website         string `json:"website"`  // [NEW]
	LogoURL         string `json:"logo_url"` // [NEW]
	DriveType       string `json:"drive_type"`
	CompanyCategory string `json:"company_category"`
	SpocID          int64  `json:"spoc_id"` // [NEW]

	CtcMin     int64  `json:"ctc_min"`
	CtcMax     int64  `json:"ctc_max"`
	CtcDisplay string `json:"ctc_display"`
	StipendMin int64  `json:"stipend_min"`
	StipendMax int64  `json:"stipend_max"`

	// Eligibility
	MinCgpa float64 `json:"min_cgpa"`

	// Additional Academic Eligibility
	TenthPercentage     *float64 `json:"tenth_percentage"`
	TwelfthPercentage   *float64 `json:"twelfth_percentage"`
	UGMinCGPA           *float64 `json:"ug_min_cgpa"`
	PGMinCGPA           *float64 `json:"pg_min_cgpa"`
	UseAggregate        bool     `json:"use_aggregate"`
	AggregatePercentage *float64 `json:"aggregate_percentage"`

	MaxBacklogsAllowed  int      `json:"max_backlogs_allowed"`
	EligibleBatches     []int    `json:"eligible_batches"`
	EligibleDepartments []string `json:"eligible_departments"`

	// Rounds & Attachments
	Rounds      []Round      `json:"rounds"`
	Attachments []Attachment `json:"attachments"`

	DriveDate    string `json:"drive_date"`
	DeadlineDate string `json:"deadline_date"`
}

// ManualRegisterInput defines the input for admin adding a student to a drive
type ManualRegisterInput struct {
	StudentID int64 `json:"student_id"`
}

type DriveApplicant struct {
	StudentID      int64   `json:"student_id"`
	FullName       string  `json:"full_name"`
	RegisterNumber string  `json:"register_number"`
	Email          string  `json:"email"`
	Department     string  `json:"department"`
	Cgpa           float64 `json:"cgpa"`
	Status         string  `json:"status"` // 'opted_in', 'shortlisted', 'placed', 'rejected'
	ResumeURL      string  `json:"resume_url"`
	AppliedAt      string  `json:"applied_at"`
}
