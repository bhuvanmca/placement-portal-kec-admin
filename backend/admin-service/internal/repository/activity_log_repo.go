package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ActivityLogRepository struct {
	DB *pgxpool.Pool
}

func NewActivityLogRepository(db *pgxpool.Pool) *ActivityLogRepository {
	return &ActivityLogRepository{DB: db}
}

// CreateLog inserts a new activity log
func (r *ActivityLogRepository) CreateLog(ctx context.Context, log models.ActivityLog) error {
	query := `
		INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.DB.Exec(ctx, query, log.UserID, log.Action, log.EntityType, log.EntityID, log.Details, log.IPAddress, time.Now())
	return err
}

// GetLogs fetches logs with pagination
func (r *ActivityLogRepository) GetLogs(ctx context.Context, limit, offset int) ([]models.ActivityLog, int64, error) {
	query := `
		SELECT 
			al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at,
			u.name, u.role
		FROM activity_logs al
		LEFT JOIN users u ON al.user_id = u.id
		ORDER BY al.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.DB.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []models.ActivityLog
	for rows.Next() {
		var l models.ActivityLog
		var userName *string
		var userRole *string
		var detailsBytes []byte

		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &detailsBytes, &l.IPAddress, &l.CreatedAt,
			&userName, &userRole,
		); err != nil {
			return nil, 0, err
		}

		if userName != nil {
			l.UserName = *userName
		}
		if userRole != nil {
			l.UserRole = *userRole
		}
		if len(detailsBytes) > 0 {
			_ = json.Unmarshal(detailsBytes, &l.Details)
		}

		logs = append(logs, l)
	}

	// Get Total Count
	var total int64
	err = r.DB.QueryRow(ctx, "SELECT COUNT(*) FROM activity_logs").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetUserLogs fetches logs for a specific user
func (r *ActivityLogRepository) GetUserLogs(ctx context.Context, userID int64, limit, offset int) ([]models.ActivityLog, int64, error) {
	query := `
		SELECT 
			id, user_id, action, entity_type, entity_id, details, ip_address, created_at
		FROM activity_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.DB.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []models.ActivityLog
	for rows.Next() {
		var l models.ActivityLog
		var detailsBytes []byte

		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &detailsBytes, &l.IPAddress, &l.CreatedAt,
		); err != nil {
			return nil, 0, err
		}

		if len(detailsBytes) > 0 {
			_ = json.Unmarshal(detailsBytes, &l.Details)
		}

		logs = append(logs, l)
	}

	var total int64
	err = r.DB.QueryRow(ctx, "SELECT COUNT(*) FROM activity_logs WHERE user_id = $1", userID).Scan(&total)

	return logs, total, nil
}
