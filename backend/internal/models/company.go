package models

import (
	"encoding/json"
	"time"
)

type CompanyChecklist struct {
	Approved      bool `json:"approved"`
	Cab           bool `json:"cab"`
	Accommodation bool `json:"accommodation"`
	Rounds        bool `json:"rounds"`
	QPPrintout    bool `json:"qp_printout"`
}

type Company struct {
	ID                  int64            `json:"id"`
	Name                string           `json:"name"`
	VisitDate           time.Time        `json:"visit_date"`
	Incharge            string           `json:"incharge"`
	EligibleDepartments string           `json:"eligible_departments"`
	Salary              string           `json:"salary"`
	Eligibility         string           `json:"eligibility"`
	Remarks             string           `json:"remarks"`
	Checklist           json.RawMessage `json:"checklist"`
	CreatedAt           time.Time        `json:"created_at"`
	UpdatedAt           time.Time        `json:"updated_at"`
}

type CreateCompanyInput struct {
	Name                string `json:"name" validate:"required"`
	VisitDate           string `json:"visit_date" validate:"required"` // Format: YYYY-MM-DD
	Incharge            string `json:"incharge"`
	EligibleDepartments string `json:"eligible_departments"`
	Salary              string `json:"salary"`
	Eligibility         string `json:"eligibility"`
	Remarks             string `json:"remarks"`
}

type UpdateCompanyChecklistInput struct {
	Checklist json.RawMessage `json:"checklist" validate:"required"`
}
