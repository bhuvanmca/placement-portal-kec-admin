package models

// UpdateProfileInput defines what a student can edit
type UpdateProfileInput struct {
	// Contact Info
	MobileNumber   string `json:"mobile_number"`
	AlternateEmail string `json:"alternate_email"`
	AddressLine1   string `json:"address_line_1"`
	City           string `json:"city"`
	State          string `json:"state"`
	Pincode        string `json:"pincode"`

	// Skills (JSONB in DB)
	LanguageSkills map[string][]string `json:"language_skills"` // e.g. {"speak": ["English"], "read": ["Tamil"]}

	// Academic Updates (The "UG/PG Scores" you asked for)
	UgCgpa          float64 `json:"ug_cgpa"`
	PgCgpa          float64 `json:"pg_cgpa"`
	CurrentBacklogs int     `json:"current_backlogs"`
	HistoryBacklogs int     `json:"history_of_backlogs"`
}
