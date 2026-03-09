package models

type Department struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Code     string `json:"code"`
	Type     string `json:"type"` // UG, PG, PhD
	IsActive bool   `json:"is_active"`
}

type Batch struct {
	ID       int  `json:"id"`
	Year     int  `json:"year"`
	IsActive bool `json:"is_active"`
}
