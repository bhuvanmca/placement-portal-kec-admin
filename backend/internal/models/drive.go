package models

import (
	"time"
)

type PlacementDrive struct {
	ID             int64  `json:"id"`
	PostedBy       int64  `json:"posted_by"`
	CompanyName    string `json:"company_name"`
	JobDescription string `json:"job_description"`
	Website        string `json:"website"`       // [NEW]
	LogoURL        string `json:"logo_url"`      // [NEW]
	Location       string `json:"location"`      // [MOVED BACK]
	LocationType   string `json:"location_type"` // [NEW] 'On-Site', 'Hybrid', 'Remote'

	Roles []JobRole `json:"roles"` // [NEW] Multiple Job Roles

	// Filters & Categories
	DriveType       string `json:"drive_type"`                 // 'Full-Time', 'Internship', 'Freelance', 'Part-Time'
	CompanyCategory string `json:"company_category"`           // 'Core', 'IT', 'Service', 'Product', 'Start-up', 'MNC'
	SpocID          int64  `json:"spoc_id"`                    // Single Point Of Contact ID
	SpocName        string `json:"spoc_name,omitempty"`        // [NEW]
	SpocDesignation string `json:"spoc_designation,omitempty"` // [NEW]

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
	DriveDate    time.Time `json:"drive_date"`
	DeadlineDate time.Time `json:"deadline_date"`
	Status       string    `json:"status"`

	CreatedAt      time.Time `json:"created_at"`
	ApplicantCount int       `json:"applicant_count"`       // [NEW] Computed field
	UserStatus     string    `json:"user_status,omitempty"` // [NEW] For student response ('opted_in', etc.)

	// User Context (If Applied)
	UserAppliedRoleIDs []int64 `json:"user_applied_role_ids,omitempty"`
	UserOptOutReason   string  `json:"user_opt_out_reason,omitempty"`
}

type JobRole struct {
	ID       int64  `json:"id"`
	DriveID  int64  `json:"drive_id"`
	RoleName string `json:"role_name"`
	Ctc      string `json:"ctc"`    // e.g. "6 LPA"
	Salary   int64  `json:"salary"` // Numeric value for filtering
	Stipend  string `json:"stipend"`
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
	JobDescription  string `json:"job_description"`
	Website         string `json:"website"`                      // [NEW]
	LogoURL         string `json:"logo_url"`                     // [NEW]
	Location        string `json:"location" validate:"required"` // [MOVED BACK]
	LocationType    string `json:"location_type"`                // [NEW]
	DriveType       string `json:"drive_type"`
	CompanyCategory string `json:"company_category"`
	SpocID          int64  `json:"spoc_id"` // [NEW]

	// Roles
	Roles []JobRole `json:"roles"` // [NEW]

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
	Status       string `json:"status"` // [NEW]
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

	AppliedRoleIDs []int64 `json:"applied_role_ids"` // [NEW]
	OptOutReason   string  `json:"opt_out_reason"`   // [NEW]
}
