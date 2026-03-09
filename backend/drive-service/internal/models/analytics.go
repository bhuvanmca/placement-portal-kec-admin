package models

// YearWiseAnalytics holds placement metrics grouped by batch year
type YearWiseAnalytics struct {
	BatchYear           int     `json:"batch_year"`
	TotalStudents       int     `json:"total_students"`
	InterestedStudents  int     `json:"interested_students"`
	PlacedStudents      int     `json:"placed_students"`
	PlacementPercentage float64 `json:"placement_percentage"`
	TotalOffers         int     `json:"total_offers"`
}

// DepartmentWiseAnalytics holds placement metrics grouped by department
type DepartmentWiseAnalytics struct {
	DepartmentCode      string  `json:"department_code"`
	TotalStudents       int     `json:"total_students"`
	InterestedStudents  int     `json:"interested_students"`
	PlacedStudents      int     `json:"placed_students"`
	PlacementPercentage float64 `json:"placement_percentage"`
}

// GenderWiseAnalytics holds placement distribution by gender
type GenderWiseAnalytics struct {
	Gender         string `json:"gender"`
	PlacedStudents int    `json:"placed_students"`
}

// CategoryWiseAnalytics holds placement distribution by company category (Core, IT, Product, etc)
type CategoryWiseAnalytics struct {
	Category       string `json:"category"`
	PlacedStudents int    `json:"placed_students"`
}

// OfferTypeAnalytics holds the distribution of Dream vs Regular offers
type OfferTypeAnalytics struct {
	OfferType      string `json:"offer_type"`
	PlacedStudents int    `json:"placed_students"`
}

// SalaryBracketAnalytics holds placement distribution by salary brackets
type SalaryBracketAnalytics struct {
	Bracket        string `json:"bracket"`
	PlacedStudents int    `json:"placed_students"`
}

// TopRecruitersAnalytics holds the top recruiters by placement volume
type TopRecruitersAnalytics struct {
	CompanyName    string `json:"company_name"`
	PlacedStudents int    `json:"placed_students"`
}

// DashboardAnalytics is the master aggregated response for the frontend
type DashboardAnalytics struct {
	YearWise       []YearWiseAnalytics       `json:"year_wise"`
	DepartmentWise []DepartmentWiseAnalytics `json:"department_wise"`
	GenderWise     []GenderWiseAnalytics     `json:"gender_wise"`
	CategoryWise   []CategoryWiseAnalytics   `json:"category_wise"`
	OfferTypeWise  []OfferTypeAnalytics      `json:"offer_type_wise"`
	SalaryWise     []SalaryBracketAnalytics  `json:"salary_wise"`
	TopRecruiters  []TopRecruitersAnalytics  `json:"top_recruiters"`
}
