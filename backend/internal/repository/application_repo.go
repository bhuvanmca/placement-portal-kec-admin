package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ApplicationRepository struct {
	DB *pgxpool.Pool
}

func NewApplicationRepository(db *pgxpool.Pool) *ApplicationRepository {
	return &ApplicationRepository{DB: db}
}

// ApplyForDrive calls our Stored Procedure or uses direct logic
func (r *ApplicationRepository) ApplyForDrive(ctx context.Context, studentID, driveID int64) (bool, string, error) {
	// UPSERT to handle re-application
	query := `
		INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
		VALUES ($1, $2, 'opted_in', NOW())
		ON CONFLICT (drive_id, student_id)
		DO UPDATE SET status = 'opted_in', updated_at = NOW()
	`
	_, err := r.DB.Exec(ctx, query, driveID, studentID)
	if err != nil {
		return false, err.Error(), err
	}
	return true, "Successfully applied", nil
}

// WithdrawApplication removes or updates the application status to 'withdrawn' or 'opted_out'
func (r *ApplicationRepository) WithdrawApplication(ctx context.Context, studentID, driveID int64) error {
	// UPSERT: If exists update, if not insert 'opted_out'
	query := `
		INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
		VALUES ($1, $2, 'opted_out', NOW())
		ON CONFLICT (drive_id, student_id) 
		DO UPDATE SET status = 'opted_out', updated_at = NOW()
	`
	_, err := r.DB.Exec(ctx, query, driveID, studentID)
	return err
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
