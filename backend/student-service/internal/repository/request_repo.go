package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/placement-portal-kec/student-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RequestRepository struct {
	DB *pgxpool.Pool
}

func NewRequestRepository(db *pgxpool.Pool) *RequestRepository {
	return &RequestRepository{DB: db}
}

func (r *RequestRepository) CreateRequest(req *models.StudentChangeRequest) error {
	query := `INSERT INTO student_change_requests (student_id, field_name, old_value, new_value, reason, status, created_at) 
              VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`
	_, err := r.DB.Exec(context.Background(), query, req.StudentID, req.FieldName, req.OldValue, req.NewValue, req.Reason)
	return err
}

func (r *RequestRepository) GetPendingRequests() ([]models.StudentChangeRequest, error) {
	query := `
        SELECT r.id, r.student_id, r.field_name, r.old_value, r.new_value, r.reason, r.status, r.created_at,
               COALESCE(u.name, 'Unknown'), sp.register_number 
        FROM student_change_requests r
        JOIN users u ON r.student_id = u.id
        LEFT JOIN student_personal sp ON u.id = sp.user_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
    `
	rows, err := r.DB.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.StudentChangeRequest
	for rows.Next() {
		var r models.StudentChangeRequest
		// We need to handle potential NULLs if sp.register_number is null (left join).
		// But Scan handles basic types. String scan from NULL usually errors unless *string.
		// Let's assume register_number is present for students.
		// Also `r.reason` might be null if old requests exist? No I created column without default but it's nullable by default.
		var regNo *string
		if err := rows.Scan(
			&r.ID, &r.StudentID, &r.FieldName, &r.OldValue, &r.NewValue, &r.Reason, &r.Status, &r.CreatedAt,
			&r.StudentName, &regNo,
		); err != nil {
			return nil, err
		}
		if regNo != nil {
			r.RegisterNumber = *regNo
		}
		requests = append(requests, r)
	}
	return requests, nil
}

func (r *RequestRepository) UpdateRequestStatus(id int64, status string, handledBy int64, adminComment *string) error {
	query := `UPDATE student_change_requests 
              SET status = $1, handled_by = $2, admin_comment = $3, handled_at = $4 
              WHERE id = $5 AND status = 'pending'`
	tag, err := r.DB.Exec(context.Background(), query, status, handledBy, adminComment, time.Now(), id)
	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 {
		var currentStatus string
		var handledByName string
		checkQuery := `
			SELECT r.status, COALESCE(u.name, 'Unknown')
			FROM student_change_requests r
			LEFT JOIN users u ON r.handled_by = u.id
			WHERE r.id = $1
		`
		err := r.DB.QueryRow(context.Background(), checkQuery, id).Scan(&currentStatus, &handledByName)
		if err != nil {
			return fmt.Errorf("request not found")
		}
		if currentStatus != "pending" {
			return fmt.Errorf("CONFLICT: Request already %s by %s", currentStatus, handledByName)
		}
		return fmt.Errorf("request not found")
	}

	return nil
}

func (r *RequestRepository) GetRequestByID(id int64) (*models.StudentChangeRequest, error) {
	var req models.StudentChangeRequest
	query := `SELECT id, student_id, field_name, old_value, new_value, reason, status FROM student_change_requests WHERE id = $1`
	err := r.DB.QueryRow(context.Background(), query, id).Scan(
		&req.ID, &req.StudentID, &req.FieldName, &req.OldValue, &req.NewValue, &req.Reason, &req.Status,
	)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *RequestRepository) GetRequestsByStudentID(studentID int64) ([]models.StudentChangeRequest, error) {
	query := `SELECT id, student_id, field_name, old_value, new_value, reason, status, created_at, admin_comment FROM student_change_requests WHERE student_id = $1 AND is_deleted_by_student = FALSE ORDER BY created_at DESC`
	rows, err := r.DB.Query(context.Background(), query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.StudentChangeRequest
	for rows.Next() {
		var r models.StudentChangeRequest
		// admin_comment can be null
		var adminComment *string
		if err := rows.Scan(
			&r.ID, &r.StudentID, &r.FieldName, &r.OldValue, &r.NewValue, &r.Reason, &r.Status, &r.CreatedAt, &adminComment,
		); err != nil {
			return nil, err
		}
		if adminComment != nil {
			r.AdminComment = *adminComment
		}
		requests = append(requests, r)
	}
	return requests, nil
}

// SoftDeleteStudentChangeRequest hides the mark/personal update request from the student app history
func (r *RequestRepository) SoftDeleteStudentChangeRequest(ctx context.Context, studentID, requestID int64) error {
	query := `UPDATE student_change_requests SET is_deleted_by_student = TRUE WHERE student_id = $1 AND id = $2`
	tag, err := r.DB.Exec(ctx, query, studentID, requestID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("request not found")
	}
	return nil
}
