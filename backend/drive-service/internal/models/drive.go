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

	DriveType       string `json:"drive_type"`       // 'Full-Time', 'Internship', 'Freelance', 'Part-Time'
	CompanyCategory string `json:"company_category"` // 'Core', 'IT', 'Service', 'Product', 'Start-up', 'MNC'
	SpocID          int64  `json:"spoc_id"`
	SpocName        string `json:"spoc_name,omitempty"`
	SpocDesignation string `json:"spoc_designation,omitempty"`

	// Drive Options
	OfferType             string `json:"offer_type"`              // [NEW] 'Regular' or 'Dream'
	AllowPlacedCandidates bool   `json:"allow_placed_candidates"` // [NEW]

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
	Rounds             []Round      `json:"rounds"`               // JSONB
	Attachments        []Attachment `json:"attachments"`          // JSONB
	ExcludedStudentIDs []int64      `json:"excluded_student_ids"` // JSONB

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
	UserRemarks        string  `json:"user_remarks,omitempty"`
	IsEligible         bool    `json:"is_eligible"`
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
	SpocID          int64  `json:"spoc_id"`

	// Drive Options
	OfferType             string `json:"offer_type"`
	AllowPlacedCandidates bool   `json:"allow_placed_candidates"`

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
	Rounds             []Round      `json:"rounds"`
	Attachments        []Attachment `json:"attachments"`
	ExcludedStudentIDs []int64      `json:"excluded_student_ids"`

	DriveDate    string `json:"drive_date"`
	DeadlineDate string `json:"deadline_date"`
	Status       string `json:"status"` // [NEW]
}

// ManualRegisterInput defines the input for admin adding a student to a drive
type ManualRegisterInput struct {
	RegisterNumber string  `json:"register_number"`
	RoleIDs        []int64 `json:"role_ids"` // [NEW] Optional role selection
}

type DriveApplicant struct {
	DriveID         int64   `json:"drive_id,omitempty"`     // [NEW]
	CompanyName     string  `json:"company_name,omitempty"` // [NEW]
	StudentID       int64   `json:"student_id"`
	FullName        string  `json:"full_name"`
	RegisterNumber  string  `json:"register_number"`
	Email           string  `json:"email"`
	Department      string  `json:"department"`
	DepartmentType  string  `json:"department_type,omitempty"`
	Cgpa            float64 `json:"cgpa"`
	Status          string  `json:"status"` // 'opted_in', 'shortlisted', 'placed', 'rejected'
	ResumeURL       string  `json:"resume_url"`
	ProfilePhotoURL string  `json:"profile_photo_url"` // [NEW]
	AppliedAt       string  `json:"applied_at"`

	AppliedRoleIDs   []int64 `json:"applied_role_ids"`   // [NEW]
	AppliedRoleNames string  `json:"applied_role_names"` // [NEW]
	OptOutReason     string  `json:"opt_out_reason"`     // [NEW]
	Remarks          string  `json:"remarks"`            // [NEW]
	ActionedBy       int64   `json:"actioned_by,omitempty"`
	ActionedAt       string  `json:"actioned_at,omitempty"` // stored as string for JSON
	ActionedByName   string  `json:"actioned_by_name,omitempty"`
}

// DriveApplicantDetailed extends StudentFullProfile with application specific data
type DriveApplicantDetailed struct {
	StudentFullProfile
	Status         string  `json:"application_status"`
	AppliedAt      string  `json:"applied_at"`
	AppliedRoleIDs []int64 `json:"applied_role_ids"`
	OptOutReason   string  `json:"opt_out_reason"`
	Remarks        string  `json:"remarks"`
}

// Eligibility Templates
type EligibilityTemplate struct {
	ID                  int64     `json:"id"`
	Name                string    `json:"name"`
	MinCgpa             float64   `json:"min_cgpa"`
	TenthPercentage     *float64  `json:"tenth_percentage"`
	TwelfthPercentage   *float64  `json:"twelfth_percentage"`
	UGMinCGPA           *float64  `json:"ug_min_cgpa"`
	PGMinCGPA           *float64  `json:"pg_min_cgpa"`
	UseAggregate        bool      `json:"use_aggregate"`
	AggregatePercentage *float64  `json:"aggregate_percentage"`
	MaxBacklogsAllowed  int       `json:"max_backlogs_allowed"`
	EligibleDepartments []string  `json:"eligible_departments"`
	EligibleBatches     []int     `json:"eligible_batches"`
	EligibleGender      string    `json:"eligible_gender"`
	CreatedBy           int64     `json:"created_by"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type CreateEligibilityTemplateInput struct {
	Name                string   `json:"name" validate:"required"`
	MinCgpa             float64  `json:"min_cgpa"`
	TenthPercentage     *float64 `json:"tenth_percentage"`
	TwelfthPercentage   *float64 `json:"twelfth_percentage"`
	UGMinCGPA           *float64 `json:"ug_min_cgpa"`
	PGMinCGPA           *float64 `json:"pg_min_cgpa"`
	UseAggregate        bool     `json:"use_aggregate"`
	AggregatePercentage *float64 `json:"aggregate_percentage"`
	MaxBacklogsAllowed  int      `json:"max_backlogs_allowed"`
	EligibleDepartments []string `json:"eligible_departments"`
	EligibleBatches     []int    `json:"eligible_batches"`
	EligibleGender      string   `json:"eligible_gender"`
}

// Selective Update (Patch) Input
type PatchDriveInput struct {
	CompanyName     *string `json:"company_name"`
	JobDescription  *string `json:"job_description"`
	Website         *string `json:"website"`
	LogoURL         *string `json:"logo_url"`
	Location        *string `json:"location"`
	LocationType    *string `json:"location_type"`
	DriveType       *string `json:"drive_type"`
	CompanyCategory *string `json:"company_category"`
	SpocID          *int64  `json:"spoc_id"`

	// Drive Options
	OfferType             *string `json:"offer_type"`
	AllowPlacedCandidates *bool   `json:"allow_placed_candidates"`

	// Roles
	Roles *[]JobRole `json:"roles"`

	// Eligibility
	MinCgpa             *float64 `json:"min_cgpa"`
	TenthPercentage     *float64 `json:"tenth_percentage"`
	TwelfthPercentage   *float64 `json:"twelfth_percentage"`
	UGMinCGPA           *float64 `json:"ug_min_cgpa"`
	PGMinCGPA           *float64 `json:"pg_min_cgpa"`
	UseAggregate        *bool    `json:"use_aggregate"`
	AggregatePercentage *float64 `json:"aggregate_percentage"`

	MaxBacklogsAllowed  *int      `json:"max_backlogs_allowed"`
	EligibleBatches     *[]int    `json:"eligible_batches"`
	EligibleDepartments *[]string `json:"eligible_departments"`

	// Rounds
	Rounds *[]Round `json:"rounds"`
	Status *string  `json:"status"`

	DriveDate    *string `json:"drive_date"`
	DeadlineDate *string `json:"deadline_date"`
}

// DriveApplication represents a student's application to a drive
type DriveApplication struct {
	ID        int64          `json:"id"`
	DriveID   int64          `json:"drive_id"`
	Status    string         `json:"status"` // opted_in, opted_out, request_to_attend
	AppliedAt time.Time      `json:"applied_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	Drive     PlacementDrive `json:"drive"`
}
