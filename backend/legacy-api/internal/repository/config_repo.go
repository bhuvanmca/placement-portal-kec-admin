package repository

import (
	"context"
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
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
	query := `UPDATE departments SET name=$1, code=$2, type=$3 WHERE id=$4`
	_, err := r.DB.Exec(ctx, query, d.Name, d.Code, d.Type, id)
	return err
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
