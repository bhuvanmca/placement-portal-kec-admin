package models

import "time"

// UpdateProfileInput defines what a student can edit
type UpdateProfileInput struct {
	// Personal Identity
	AboutMe              string `json:"about_me"`
	PlacementWillingness string `json:"placement_willingness"`

	MobileNumber string `json:"mobile_number"`
	Dob          string `json:"dob"`

	// Address
	City  string `json:"city"`
	State string `json:"state"`

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

	UgCgpa          float64 `json:"ug_cgpa"`
	PgCgpa          float64 `json:"pg_cgpa"`
	CurrentBacklogs int     `json:"current_backlogs"`
	HistoryBacklogs int     `json:"history_of_backlogs"`
	GapYears        int     `json:"gap_years"`
	GapReason       string  `json:"gap_reason"`

	// Documents
	ResumeURL       string `json:"resume_url"`
	ProfilePhotoURL string `json:"profile_photo_url"`
	AadharCardURL   string `json:"aadhar_card_url"`
	PanCardURL      string `json:"pan_card_url"`
}

// CreateStudentInput defines the payload for manually adding a student
type CreateStudentInput struct {
	FullName       string `json:"full_name" validate:"required"`
	Email          string `json:"email" validate:"required,email"`
	RegisterNumber string `json:"register_number" validate:"required"`
	BatchYear      int    `json:"batch_year" validate:"required"`
	Department     string `json:"department" validate:"required"`
	MobileNumber   string `json:"mobile_number" validate:"required"`
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
	BatchYear            int               `json:"batch_year"`
	StudentType          string            `json:"student_type"`
	PlacementWillingness string            `json:"placement_willingness"`
	Gender               string            `json:"gender"`
	Dob                  string            `json:"dob"`
	MobileNumber         string            `json:"mobile_number"`
	City                 string            `json:"city"`
	State                string            `json:"state"`
	SocialLinks          map[string]string `json:"social_links"`
	LanguageSkills       []string          `json:"language_skills"`
	AboutMe              string            `json:"about_me"`

	// Academics
	TenthMark       float64 `json:"tenth_mark"`
	TwelfthMark     float64 `json:"twelfth_mark"`
	DiplomaMark     float64 `json:"diploma_mark"`
	UgCgpa          float64 `json:"ug_cgpa"`
	PgCgpa          float64 `json:"pg_cgpa"`
	CurrentBacklogs int     `json:"current_backlogs"`
	HistoryBacklogs int     `json:"history_of_backlogs"`
	GapYears        int     `json:"gap_years"`
	GapReason       string  `json:"gap_reason"`

	// Documents (URLs)
	ResumeURL       string `json:"resume_url"`
	ProfilePhotoURL string `json:"profile_photo_url"`
	AadharCardURL   string `json:"aadhar_card_url"`
	PanCardURL      string `json:"pan_card_url"`
}
