package models

import "time"

// UpdateProfileInput defines what a student can edit
type UpdateProfileInput struct {
	// Personal Identity
	MobileNumber string `json:"mobile_number"`
	Dob          string `json:"dob"`
	Gender       string `json:"gender"`

	// Address
	AddressLine1 string `json:"address_line_1"`
	AddressLine2 string `json:"address_line_2"`
	State        string `json:"state"`

	PlacementWillingness string `json:"placement_willingness"`

	// Skills & Flexible Data
	SocialLinks    map[string]string `json:"social_links"`    // e.g. {"linkedin": "url", "github": "url"}
	LanguageSkills []string          `json:"language_skills"` // e.g. ["English", "Tamil"]

	// Academic Updates
	TenthMark          float64 `json:"tenth_mark"`
	TenthBoard         string  `json:"tenth_board"`
	TenthYearPass      int     `json:"tenth_year_pass"`
	TenthInstitution   string  `json:"tenth_institution"`
	TwelfthMark        float64 `json:"twelfth_mark"`
	TwelfthBoard       string  `json:"twelfth_board"`
	TwelfthYearPass    int     `json:"twelfth_year_pass"`
	TwelfthInstitution string  `json:"twelfth_institution"`
	DiplomaMark        float64 `json:"diploma_mark"`
	DiplomaYearPass    int     `json:"diploma_year_pass"`
	DiplomaInstitution string  `json:"diploma_institution"`

	UgCgpa float64 `json:"ug_cgpa"`
	PgCgpa float64 `json:"pg_cgpa"`

	// Fields for External Degrees (e.g. if student is PG, they fill UG manually)
	UgDegreeName     string `json:"ug_degree_name"`
	UgSpecialisation string `json:"ug_specialisation"`
	UgInstitution    string `json:"ug_institution"`
	UgYearPass       int    `json:"ug_year_pass"`

	// PG Fields (Usually internal, but flexible)
	PgDegreeName     string `json:"pg_degree_name"`
	PgSpecialisation string `json:"pg_specialisation"`
	PgInstitution    string `json:"pg_institution"`
	PgYearPass       int    `json:"pg_year_pass"`

	UgGpaS1  float64 `json:"ug_gpa_s1"`
	UgGpaS2  float64 `json:"ug_gpa_s2"`
	UgGpaS3  float64 `json:"ug_gpa_s3"`
	UgGpaS4  float64 `json:"ug_gpa_s4"`
	UgGpaS5  float64 `json:"ug_gpa_s5"`
	UgGpaS6  float64 `json:"ug_gpa_s6"`
	UgGpaS7  float64 `json:"ug_gpa_s7"`
	UgGpaS8  float64 `json:"ug_gpa_s8"`
	UgGpaS9  float64 `json:"ug_gpa_s9"`
	UgGpaS10 float64 `json:"ug_gpa_s10"`

	PgGpaS1 float64 `json:"pg_gpa_s1"`
	PgGpaS2 float64 `json:"pg_gpa_s2"`
	PgGpaS3 float64 `json:"pg_gpa_s3"`
	PgGpaS4 float64 `json:"pg_gpa_s4"`
	PgGpaS5 float64 `json:"pg_gpa_s5"`
	PgGpaS6 float64 `json:"pg_gpa_s6"`
	PgGpaS7 float64 `json:"pg_gpa_s7"`
	PgGpaS8 float64 `json:"pg_gpa_s8"`

	CurrentBacklogs int    `json:"current_backlogs"`
	HistoryBacklogs int    `json:"history_of_backlogs"`
	GapYears        int    `json:"gap_years"`
	GapReason       string `json:"gap_reason"`

	// Documents
	ResumeURL       string `json:"resume_url"`
	ProfilePhotoURL string `json:"profile_photo_url"`

	// Identity
	PanNumber    string `json:"pan_number"`
	AadharNumber string `json:"aadhar_number"`
}

// CreateStudentInput defines the payload for manually adding a student
type CreateStudentInput struct {
	FullName       string `json:"full_name" validate:"required"`
	Email          string `json:"email" validate:"required,email"`
	RegisterNumber string `json:"register_number" validate:"required"`
	BatchYear      int    `json:"batch_year" validate:"required"`
	Department     string `json:"department" validate:"required"`
	StudentType    string `json:"student_type"`
	Gender         string `json:"gender"`
	MobileNumber   string `json:"mobile_number"`
	Password       string `json:"password"` // Optional, default will be used if empty
}

// StudentFullProfile represents the complete view for Admins
type StudentFullProfile struct {
	// User Info
	ID        int64      `json:"id"`
	Email     string     `json:"email"`
	IsBlocked bool       `json:"is_blocked"`
	LastLogin *time.Time `json:"last_login"`

	// Personal Info
	FullName             string            `json:"full_name"`
	RegisterNumber       string            `json:"register_number"`
	Department           string            `json:"department"`
	DepartmentType       string            `json:"department_type"` // 'UG' or 'PG' from Master
	BatchYear            int               `json:"batch_year"`
	StudentType          string            `json:"student_type"`
	PlacementWillingness string            `json:"placement_willingness"`
	Gender               string            `json:"gender"`
	Dob                  string            `json:"dob"`
	MobileNumber         string            `json:"mobile_number"`
	AddressLine1         string            `json:"address_line_1"`
	AddressLine2         string            `json:"address_line_2"`
	State                string            `json:"state"`
	SocialLinks          map[string]string `json:"social_links"`
	LanguageSkills       []string          `json:"language_skills"`

	// Academics
	TenthMark        float64 `json:"tenth_mark"`
	TenthBoard       string  `json:"tenth_board"`
	TenthYearPass    int     `json:"tenth_year_pass"`
	TenthInstitution string  `json:"tenth_institution"`

	TwelfthMark        float64 `json:"twelfth_mark"`
	TwelfthBoard       string  `json:"twelfth_board"`
	TwelfthYearPass    int     `json:"twelfth_year_pass"`
	TwelfthInstitution string  `json:"twelfth_institution"`

	DiplomaMark        float64 `json:"diploma_mark"`
	DiplomaYearPass    int     `json:"diploma_year_pass"`
	DiplomaInstitution string  `json:"diploma_institution"`

	UgCgpa float64 `json:"ug_cgpa"`
	PgCgpa float64 `json:"pg_cgpa"`

	// Pass Years for Degrees
	UgYearPass    int    `json:"ug_year_pass"`
	UgInstitution string `json:"ug_institution"`
	PgYearPass    int    `json:"pg_year_pass"`
	PgInstitution string `json:"pg_institution"`

	UgGpaS1  float64 `json:"ug_gpa_s1"`
	UgGpaS2  float64 `json:"ug_gpa_s2"`
	UgGpaS3  float64 `json:"ug_gpa_s3"`
	UgGpaS4  float64 `json:"ug_gpa_s4"`
	UgGpaS5  float64 `json:"ug_gpa_s5"`
	UgGpaS6  float64 `json:"ug_gpa_s6"`
	UgGpaS7  float64 `json:"ug_gpa_s7"`
	UgGpaS8  float64 `json:"ug_gpa_s8"`
	UgGpaS9  float64 `json:"ug_gpa_s9"`
	UgGpaS10 float64 `json:"ug_gpa_s10"`

	PgGpaS1 float64 `json:"pg_gpa_s1"`
	PgGpaS2 float64 `json:"pg_gpa_s2"`
	PgGpaS3 float64 `json:"pg_gpa_s3"`
	PgGpaS4 float64 `json:"pg_gpa_s4"`
	PgGpaS5 float64 `json:"pg_gpa_s5"`
	PgGpaS6 float64 `json:"pg_gpa_s6"`
	PgGpaS7 float64 `json:"pg_gpa_s7"`
	PgGpaS8 float64 `json:"pg_gpa_s8"`

	CurrentBacklogs int    `json:"current_backlogs"`
	HistoryBacklogs int    `json:"history_of_backlogs"`
	GapYears        int    `json:"gap_years"`
	GapReason       string `json:"gap_reason"`

	// Documents (URLs)
	ResumeURL       string `json:"resume_url"`
	ProfilePhotoURL string `json:"profile_photo_url"`

	// Identity
	PanNumber    string `json:"pan_number"`
	AadharNumber string `json:"aadhar_number"`

	// Timestamps
	ResumeUpdatedAt *time.Time `json:"resume_updated_at"`

	// Placement Info
	PlacementStats PlacementStats `json:"placement_stats"`
}

type PlacementStats struct {
	EligibleDrives int `json:"eligible_drives"`
	OptedIn        int `json:"opted_in"`
	OptedOut       int `json:"opted_out"`
	Attended       int `json:"attended"`
	OffersReceived int `json:"offers_received"`
}

// --- Normalized Database Types (Internal Use) ---

type StudentSchooling struct {
	UserID             int64   `json:"user_id"`
	TenthMark          float64 `json:"tenth_mark"`
	TenthBoard         string  `json:"tenth_board"`
	TenthYearPass      int     `json:"tenth_year_pass"`
	TenthInstitution   string  `json:"tenth_institution"`
	TwelfthMark        float64 `json:"twelfth_mark"`
	TwelfthBoard       string  `json:"twelfth_board"`
	TwelfthYearPass    int     `json:"twelfth_year_pass"`
	TwelfthInstitution string  `json:"twelfth_institution"`
	DiplomaMark        float64 `json:"diploma_mark"`
	DiplomaYearPass    int     `json:"diploma_year_pass"`
	DiplomaInstitution string  `json:"diploma_institution"`
	CurrentBacklogs    int     `json:"current_backlogs"`
	HistoryBacklogs    int     `json:"history_of_backlogs"`
	GapYears           int     `json:"gap_years"`
	GapReason          string  `json:"gap_reason"`
}

type StudentDegree struct {
	UserID         int64              `json:"user_id"`
	DegreeLevel    string             `json:"degree_level"`  // UG, PG, PhD
	DepartmentID   *int               `json:"department_id"` // Nullable FK
	DegreeName     string             `json:"degree_name"`
	Specialisation string             `json:"specialisation"`
	Institution    string             `json:"institution"`
	YearPass       int                `json:"year_pass"`
	Cgpa           float64            `json:"cgpa"`
	SemesterGpas   map[string]float64 `json:"semester_gpas"`
}

// FieldPermission represents allowing/denying student edits
type FieldPermission struct {
	FieldName string `json:"field_name"`
	Label     string `json:"label"`
	IsEnabled bool   `json:"is_enabled"`
	Category  string `json:"category"`
}

// StudentChangeRequest represents a pending update
type StudentChangeRequest struct {
	ID           int64      `json:"id"`
	StudentID    int64      `json:"student_id"`
	FieldName    string     `json:"field_name"`
	OldValue     string     `json:"old_value"`
	NewValue     string     `json:"new_value"`
	Reason       string     `json:"reason"`
	Status       string     `json:"status"` // pending, approved, rejected
	AdminComment string     `json:"admin_comment,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	HandledAt    *time.Time `json:"handled_at,omitempty"`
	HandledBy    *int64     `json:"handled_by,omitempty"`

	// Joined Data
	StudentName    string `json:"student_name,omitempty"`
	RegisterNumber string `json:"register_number,omitempty"`
	FieldLabel     string `json:"field_label,omitempty"`
}
