package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/admin-service/internal/models"
)

type ConfigRepository struct {
	DB *pgxpool.Pool
}

func NewConfigRepository(db *pgxpool.Pool) *ConfigRepository {
	return &ConfigRepository{DB: db}
}

// --- DEPARTMENTS ---

func (r *ConfigRepository) GetAllDepartments(ctx context.Context) ([]models.Department, error) {
	query := `SELECT id, name, code, type, is_active FROM departments ORDER BY code ASC`
	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var depts []models.Department
	for rows.Next() {
		var d models.Department
		if err := rows.Scan(&d.ID, &d.Name, &d.Code, &d.Type, &d.IsActive); err != nil {
			return nil, err
		}
		depts = append(depts, d)
	}
	return depts, nil
}

func (r *ConfigRepository) CreateDepartment(ctx context.Context, d models.Department) error {
	query := `INSERT INTO departments (name, code, type, is_active) VALUES ($1, $2, $3, true)`
	_, err := r.DB.Exec(ctx, query, d.Name, d.Code, d.Type)
	return err
}

func (r *ConfigRepository) DeleteDepartment(ctx context.Context, id int) error {
	// 1. Get Department Code
	var code string
	if err := r.DB.QueryRow(ctx, "SELECT code FROM departments WHERE id = $1", id).Scan(&code); err != nil {
		return err
	}

	// 2. Cascade Delete Users (Students in this department)
	// We first identify the users, then delete them (which cascades to profile, docs, etc.)
	// Note: We only delete 'student' role users to be safe, though department link implies student/coordinator.
	// Coordinators also have department_code in users table, but student_personal has department ref.
	// The query below targets students via student_personal.
	queryDeleteUsers := `
		DELETE FROM users 
		WHERE id IN (
			SELECT user_id FROM student_personal WHERE department = $1
		)
	`
	if _, err := r.DB.Exec(ctx, queryDeleteUsers, code); err != nil {
		return fmt.Errorf("failed to delete associated students: %w", err)
	}

	// 3. Delete Department
	query := `DELETE FROM departments WHERE id = $1`
	_, err := r.DB.Exec(ctx, query, id)
	return err
}

func (r *ConfigRepository) UpdateDepartment(ctx context.Context, id int, d models.Department) error {
	// Check if the code is being changed — if so, cascade to referencing tables
	var oldCode string
	if err := r.DB.QueryRow(ctx, "SELECT code FROM departments WHERE id = $1", id).Scan(&oldCode); err != nil {
		return fmt.Errorf("department not found: %w", err)
	}

	if oldCode == d.Code {
		// Code unchanged — simple update
		query := `UPDATE departments SET name=$1, code=$2, type=$3 WHERE id=$4`
		_, err := r.DB.Exec(ctx, query, d.Name, d.Code, d.Type, id)
		return err
	}

	// Code is changing — cascade within a transaction
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update referencing tables first
	cascadeQueries := []string{
		`UPDATE student.student_personal SET department=$1 WHERE department=$2`,
		`UPDATE admin.eligibility_template_departments SET department_code=$1 WHERE department_code=$2`,
		`UPDATE drive.drive_eligible_departments SET department_code=$1 WHERE department_code=$2`,
		`UPDATE public.users SET department_code=$1 WHERE department_code=$2`,
	}
	for _, q := range cascadeQueries {
		if _, err := tx.Exec(ctx, q, d.Code, oldCode); err != nil {
			// Ignore "relation does not exist" errors for optional tables
			if !isUndefinedTableError(err) {
				return fmt.Errorf("failed to cascade code update: %w", err)
			}
		}
	}

	// Update the department itself
	if _, err := tx.Exec(ctx, `UPDATE departments SET name=$1, code=$2, type=$3 WHERE id=$4`, d.Name, d.Code, d.Type, id); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// --- BATCHES ---

func (r *ConfigRepository) GetAllBatches(ctx context.Context) ([]models.Batch, error) {
	query := `SELECT id, year, is_active FROM batches ORDER BY year DESC`
	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []models.Batch
	for rows.Next() {
		var b models.Batch
		if err := rows.Scan(&b.ID, &b.Year, &b.IsActive); err != nil {
			return nil, err
		}
		batches = append(batches, b)
	}
	return batches, nil
}

func (r *ConfigRepository) CreateBatch(ctx context.Context, year int) error {
	query := `INSERT INTO batches (year, is_active) VALUES ($1, true)`
	_, err := r.DB.Exec(ctx, query, year)
	return err
}

func (r *ConfigRepository) DeleteBatch(ctx context.Context, id int) error {
	// 1. Get Batch Year
	var year int
	if err := r.DB.QueryRow(ctx, "SELECT year FROM batches WHERE id = $1", id).Scan(&year); err != nil {
		return err
	}

	// 2. Cascade Delete Users (Students in this batch)
	queryDeleteUsers := `
		DELETE FROM users 
		WHERE id IN (
			SELECT user_id FROM student_personal WHERE batch_year = $1
		)
	`
	if _, err := r.DB.Exec(ctx, queryDeleteUsers, year); err != nil {
		return fmt.Errorf("failed to delete associated students: %w", err)
	}

	// 3. Delete Batch
	query := `DELETE FROM batches WHERE id = $1`
	_, err := r.DB.Exec(ctx, query, id)
	return err
}

func (r *ConfigRepository) UpdateBatch(ctx context.Context, id int, year int) error {
	query := `UPDATE batches SET year=$1 WHERE id=$2`
	_, err := r.DB.Exec(ctx, query, year, id)
	return err
}

// isUndefinedTableError returns true if the error is a "relation does not exist" pg error (42P01)
func isUndefinedTableError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "42P01")
}
