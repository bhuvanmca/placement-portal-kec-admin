package models

import "time"

// User represents the user entity
type User struct {
	ID              int64      `json:"id"`
	Email           string     `json:"email"`
	PasswordHash    string     `json:"-"`
	Role            string     `json:"role"`
	Name            *string    `json:"name,omitempty"`
	DepartmentCode  *string    `json:"department_code,omitempty"`
	ProfilePhotoURL *string    `json:"profile_photo_url,omitempty"`
	FCMToken        string     `json:"fcm_token"`
	IsActive        bool       `json:"is_active"`
	IsBlocked       bool       `json:"is_blocked"`
	LastLogin       *time.Time `json:"last_login"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// UpdateProfileInput defines what a student can edit
type UpdateProfileInput struct {
	MobileNumber         string            `json:"mobile_number"`
	Dob                  string            `json:"dob"`
	Gender               string            `json:"gender"`
	AddressLine1         string            `json:"address_line_1"`
	AddressLine2         string            `json:"address_line_2"`
	State                string            `json:"state"`
	PlacementWillingness string            `json:"placement_willingness"`
	SocialLinks          map[string]string `json:"social_links"`
	LanguageSkills       []string          `json:"language_skills"`
	TenthMark            float64           `json:"tenth_mark"`
	TenthBoard           string            `json:"tenth_board"`
	TenthYearPass        int               `json:"tenth_year_pass"`
	TenthInstitution     string            `json:"tenth_institution"`
	TwelfthMark          float64           `json:"twelfth_mark"`
	TwelfthBoard         string            `json:"twelfth_board"`
	TwelfthYearPass      int               `json:"twelfth_year_pass"`
	TwelfthInstitution   string            `json:"twelfth_institution"`
	DiplomaMark          float64           `json:"diploma_mark"`
	DiplomaYearPass      int               `json:"diploma_year_pass"`
	DiplomaInstitution   string            `json:"diploma_institution"`
	UgCgpa               float64           `json:"ug_cgpa"`
	PgCgpa               float64           `json:"pg_cgpa"`
	UgDegreeName         string            `json:"ug_degree_name"`
	UgSpecialisation     string            `json:"ug_specialisation"`
	UgInstitution        string            `json:"ug_institution"`
	UgYearPass           int               `json:"ug_year_pass"`
	PgDegreeName         string            `json:"pg_degree_name"`
	PgSpecialisation     string            `json:"pg_specialisation"`
	PgInstitution        string            `json:"pg_institution"`
	PgYearPass           int               `json:"pg_year_pass"`
	UgGpaS1              float64           `json:"ug_gpa_s1"`
	UgGpaS2              float64           `json:"ug_gpa_s2"`
	UgGpaS3              float64           `json:"ug_gpa_s3"`
	UgGpaS4              float64           `json:"ug_gpa_s4"`
	UgGpaS5              float64           `json:"ug_gpa_s5"`
	UgGpaS6              float64           `json:"ug_gpa_s6"`
	UgGpaS7              float64           `json:"ug_gpa_s7"`
	UgGpaS8              float64           `json:"ug_gpa_s8"`
	UgGpaS9              float64           `json:"ug_gpa_s9"`
	UgGpaS10             float64           `json:"ug_gpa_s10"`
	PgGpaS1              float64           `json:"pg_gpa_s1"`
	PgGpaS2              float64           `json:"pg_gpa_s2"`
	PgGpaS3              float64           `json:"pg_gpa_s3"`
	PgGpaS4              float64           `json:"pg_gpa_s4"`
	PgGpaS5              float64           `json:"pg_gpa_s5"`
	PgGpaS6              float64           `json:"pg_gpa_s6"`
	PgGpaS7              float64           `json:"pg_gpa_s7"`
	PgGpaS8              float64           `json:"pg_gpa_s8"`
	CurrentBacklogs      int               `json:"current_backlogs"`
	HistoryBacklogs      int               `json:"history_of_backlogs"`
	GapYears             int               `json:"gap_years"`
	GapReason            string            `json:"gap_reason"`
	ResumeURL            string            `json:"resume_url"`
	ProfilePhotoURL      string            `json:"profile_photo_url"`
	PanNumber            string            `json:"pan_number"`
	AadharNumber         string            `json:"aadhar_number"`
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
	Password       string `json:"password"`
}

// StudentFullProfile represents the complete student profile
type StudentFullProfile struct {
	ID                   int64             `json:"id"`
	Email                string            `json:"email"`
	IsBlocked            bool              `json:"is_blocked"`
	LastLogin            *time.Time        `json:"last_login"`
	FullName             string            `json:"full_name"`
	RegisterNumber       string            `json:"register_number"`
	Department           string            `json:"department"`
	DepartmentType       string            `json:"department_type"`
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
	TenthMark            float64           `json:"tenth_mark"`
	TenthBoard           string            `json:"tenth_board"`
	TenthYearPass        int               `json:"tenth_year_pass"`
	TenthInstitution     string            `json:"tenth_institution"`
	TwelfthMark          float64           `json:"twelfth_mark"`
	TwelfthBoard         string            `json:"twelfth_board"`
	TwelfthYearPass      int               `json:"twelfth_year_pass"`
	TwelfthInstitution   string            `json:"twelfth_institution"`
	DiplomaMark          float64           `json:"diploma_mark"`
	DiplomaYearPass      int               `json:"diploma_year_pass"`
	DiplomaInstitution   string            `json:"diploma_institution"`
	UgCgpa               float64           `json:"ug_cgpa"`
	PgCgpa               float64           `json:"pg_cgpa"`
	UgYearPass           int               `json:"ug_year_pass"`
	UgInstitution        string            `json:"ug_institution"`
	PgYearPass           int               `json:"pg_year_pass"`
	PgInstitution        string            `json:"pg_institution"`
	UgGpaS1              float64           `json:"ug_gpa_s1"`
	UgGpaS2              float64           `json:"ug_gpa_s2"`
	UgGpaS3              float64           `json:"ug_gpa_s3"`
	UgGpaS4              float64           `json:"ug_gpa_s4"`
	UgGpaS5              float64           `json:"ug_gpa_s5"`
	UgGpaS6              float64           `json:"ug_gpa_s6"`
	UgGpaS7              float64           `json:"ug_gpa_s7"`
	UgGpaS8              float64           `json:"ug_gpa_s8"`
	UgGpaS9              float64           `json:"ug_gpa_s9"`
	UgGpaS10             float64           `json:"ug_gpa_s10"`
	PgGpaS1              float64           `json:"pg_gpa_s1"`
	PgGpaS2              float64           `json:"pg_gpa_s2"`
	PgGpaS3              float64           `json:"pg_gpa_s3"`
	PgGpaS4              float64           `json:"pg_gpa_s4"`
	PgGpaS5              float64           `json:"pg_gpa_s5"`
	PgGpaS6              float64           `json:"pg_gpa_s6"`
	PgGpaS7              float64           `json:"pg_gpa_s7"`
	PgGpaS8              float64           `json:"pg_gpa_s8"`
	CurrentBacklogs      int               `json:"current_backlogs"`
	HistoryBacklogs      int               `json:"history_of_backlogs"`
	GapYears             int               `json:"gap_years"`
	GapReason            string            `json:"gap_reason"`
	ResumeURL            string            `json:"resume_url"`
	ProfilePhotoURL      string            `json:"profile_photo_url"`
	PanNumber            string            `json:"pan_number"`
	AadharNumber         string            `json:"aadhar_number"`
	ResumeUpdatedAt      *time.Time        `json:"resume_updated_at"`
	PlacementStats       PlacementStats    `json:"placement_stats"`
}

type PlacementStats struct {
	EligibleDrives int `json:"eligible_drives"`
	OptedIn        int `json:"opted_in"`
	OptedOut       int `json:"opted_out"`
	Attended       int `json:"attended"`
	OffersReceived int `json:"offers_received"`
}

// StudentChangeRequest represents a pending update
type StudentChangeRequest struct {
	ID             int64      `json:"id"`
	StudentID      int64      `json:"student_id"`
	FieldName      string     `json:"field_name"`
	OldValue       string     `json:"old_value"`
	NewValue       string     `json:"new_value"`
	Reason         string     `json:"reason"`
	Status         string     `json:"status"`
	AdminComment   string     `json:"admin_comment,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	HandledAt      *time.Time `json:"handled_at,omitempty"`
	HandledBy      *int64     `json:"handled_by,omitempty"`
	StudentName    string     `json:"student_name,omitempty"`
	RegisterNumber string     `json:"register_number,omitempty"`
	FieldLabel     string     `json:"field_label,omitempty"`
}

// ActivityLog represents an activity log entry
type ActivityLog struct {
	UserID     int64  `json:"user_id"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	Details    []byte `json:"details"`
	IPAddress  string `json:"ip_address"`
}

// FieldPermission represents allowing/denying student edits
type FieldPermission struct {
	FieldName string `json:"field_name"`
	Label     string `json:"label"`
	IsEnabled bool   `json:"is_enabled"`
	Category  string `json:"category"`
}
