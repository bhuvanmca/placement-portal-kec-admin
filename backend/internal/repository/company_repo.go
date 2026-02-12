package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CompanyRepository struct {
	DB *pgxpool.Pool
}

func NewCompanyRepository(db *pgxpool.Pool) *CompanyRepository {
	return &CompanyRepository{DB: db}
}

func (r *CompanyRepository) Create(ctx context.Context, company *models.Company) error {
	query := `
		INSERT INTO companies (name, visit_date, incharge, eligible_departments, salary, eligibility, remarks)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.DB.QueryRow(ctx, query,
		company.Name,
		company.VisitDate,
		company.Incharge,
		company.EligibleDepartments,
		company.Salary,
		company.Eligibility,
		company.Remarks,
	).Scan(&company.ID, &company.CreatedAt, &company.UpdatedAt)
}

func (r *CompanyRepository) GetAll(ctx context.Context) ([]models.Company, error) {
	query := `SELECT id, name, visit_date, incharge, eligible_departments, salary, eligibility, remarks, checklist, created_at, updated_at FROM companies ORDER BY visit_date DESC`
	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var companies []models.Company
	for rows.Next() {
		var c models.Company
		err := rows.Scan(
			&c.ID, &c.Name, &c.VisitDate, &c.Incharge, &c.EligibleDepartments,
			&c.Salary, &c.Eligibility, &c.Remarks, &c.Checklist, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		companies = append(companies, c)
	}
	return companies, nil
}

func (r *CompanyRepository) Update(ctx context.Context, id int64, company *models.Company) error {
	query := `
		UPDATE companies
		SET name = $1, visit_date = $2, incharge = $3, eligible_departments = $4, salary = $5, eligibility = $6, remarks = $7, updated_at = NOW()
		WHERE id = $8
	`
	_, err := r.DB.Exec(ctx, query,
		company.Name,
		company.VisitDate,
		company.Incharge,
		company.EligibleDepartments,
		company.Salary,
		company.Eligibility,
		company.Remarks,
		id,
	)
	return err
}

func (r *CompanyRepository) UpdateChecklist(ctx context.Context, id int64, checklist json.RawMessage) error {
	query := `UPDATE companies SET checklist = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.DB.Exec(ctx, query, checklist, id)
	return err
}

func (r *CompanyRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM companies WHERE id = $1`
	_, err := r.DB.Exec(ctx, query, id)
	return err
}
