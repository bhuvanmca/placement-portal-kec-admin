package repository

import (
	"context"
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PermissionRepository struct {
	DB *pgxpool.Pool
}

func NewPermissionRepository(db *pgxpool.Pool) *PermissionRepository {
	return &PermissionRepository{DB: db}
}

// GetAllPermissions returns all field permissions
func (r *PermissionRepository) GetAllPermissions() ([]models.FieldPermission, error) {
	query := `SELECT field_name, label, is_enabled, category FROM field_permissions ORDER BY category, label`
	rows, err := r.DB.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []models.FieldPermission
	for rows.Next() {
		var p models.FieldPermission
		if err := rows.Scan(&p.FieldName, &p.Label, &p.IsEnabled, &p.Category); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// UpdatePermission toggles the is_enabled status
func (r *PermissionRepository) UpdatePermission(fieldName string, isEnabled bool) error {
	query := `UPDATE field_permissions SET is_enabled = $1 WHERE field_name = $2`
	result, err := r.DB.Exec(context.Background(), query, isEnabled, fieldName)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("field not found")
	}
	return nil
}

// GetPermission check if specific field is enabled
func (r *PermissionRepository) GetPermission(fieldName string) (bool, error) {
	var isEnabled bool
	query := `SELECT is_enabled FROM field_permissions WHERE field_name = $1`
	err := r.DB.QueryRow(context.Background(), query, fieldName).Scan(&isEnabled)
	if err != nil {
		if err == pgx.ErrNoRows {
			// If field not in permissions table, assume it's allowed
			return true, nil
		}
		return false, err
	}
	return isEnabled, nil
}

// CreateChangeRequest creates a new request
func (r *PermissionRepository) CreateChangeRequest(req models.StudentChangeRequest) error {
	query := `INSERT INTO student_change_requests (student_id, field_name, old_value, new_value, status) 
			  VALUES ($1, $2, $3, $4, 'pending')`
	_, err := r.DB.Exec(context.Background(), query, req.StudentID, req.FieldName, req.OldValue, req.NewValue)
	return err
}

// GetPendingRequests returns all pending requests with student details
func (r *PermissionRepository) GetPendingRequests() ([]models.StudentChangeRequest, error) {
	query := `
		SELECT 
			r.id, r.student_id, r.field_name, r.old_value, r.new_value, r.created_at,
			u.name, sp.register_number, fp.label
		FROM student_change_requests r
		JOIN student_personal sp ON r.student_id = sp.user_id
		JOIN users u ON r.student_id = u.id
		JOIN field_permissions fp ON r.field_name = fp.field_name
		WHERE r.status = 'pending'
		ORDER BY r.created_at DESC
	`
	rows, err := r.DB.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reqs []models.StudentChangeRequest
	for rows.Next() {
		var r models.StudentChangeRequest
		if err := rows.Scan(
			&r.ID, &r.StudentID, &r.FieldName, &r.OldValue, &r.NewValue, &r.CreatedAt,
			&r.StudentName, &r.RegisterNumber, &r.FieldLabel,
		); err != nil {
			return nil, err
		}
		reqs = append(reqs, r)
	}
	return reqs, nil
}

// UpdateRequestStatus approves or rejects a request
func (r *PermissionRepository) UpdateRequestStatus(id int64, status string, handledBy int64) error {
	query := `UPDATE student_change_requests 
			  SET status = $1, handled_by = $2, handled_at = NOW() 
			  WHERE id = $3`
	_, err := r.DB.Exec(context.Background(), query, status, handledBy, id)
	return err
}

// GetRequestByID fetches a single request
func (r *PermissionRepository) GetRequestByID(id int64) (*models.StudentChangeRequest, error) {
	query := `SELECT id, student_id, field_name, old_value, new_value, status FROM student_change_requests WHERE id = $1`
	var req models.StudentChangeRequest
	err := r.DB.QueryRow(context.Background(), query, id).Scan(&req.ID, &req.StudentID, &req.FieldName, &req.OldValue, &req.NewValue, &req.Status)
	if err != nil {
		return nil, err
	}
	return &req, nil
}
