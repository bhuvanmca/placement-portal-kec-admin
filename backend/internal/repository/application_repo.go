package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ApplicationRepository struct {
	DB *pgxpool.Pool
}

func NewApplicationRepository(db *pgxpool.Pool) *ApplicationRepository {
	return &ApplicationRepository{DB: db}
}

// ApplyForDrive calls our Stored Procedure
func (r *ApplicationRepository) ApplyForDrive(ctx context.Context, studentID, driveID int64) (bool, string, error) {
	var success bool
	var message string

	// We select the complex type fields individually
	query := `SELECT (apply_for_drive($1, $2)).*`

	err := r.DB.QueryRow(ctx, query, studentID, driveID).Scan(&success, &message)
	if err != nil {
		return false, "", fmt.Errorf("database execution error: %w", err)
	}

	return success, message, nil
}

// GetStudentApplications lists what a student has applied to
func (r *ApplicationRepository) GetStudentApplications(ctx context.Context, studentID int64) ([]map[string]interface{}, error) {
	query := `
        SELECT da.drive_id, pd.company_name, pd.job_role, da.status, da.applied_at
        FROM drive_applications da
        JOIN placement_drives pd ON da.drive_id = pd.id
        WHERE da.student_id = $1
        ORDER BY da.applied_at DESC
    `
	rows, err := r.DB.Query(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []map[string]interface{}
	for rows.Next() {
		var driveID int64
		var company, role, status string
		var appliedAt time.Time
		rows.Scan(&driveID, &company, &role, &status, &appliedAt)

		apps = append(apps, map[string]interface{}{
			"drive_id": driveID,
			"company":  company,
			"role":     role,
			"status":   status,
			"date":     appliedAt,
		})
	}
	return apps, nil
}
