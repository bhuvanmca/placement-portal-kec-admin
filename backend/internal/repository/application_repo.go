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
func (r *ApplicationRepository) ApplyForDrive(ctx context.Context, studentID, driveID int64, roleIDs []int64) (bool, string, error) {
	// UPSERT to handle re-application
	// Ensure roles is roughly empty list if nil, though pgx handles nil slice as null often, we want [] for jsonb
	// Actually pgx handles []int64 -> int8[] by default?
	// But the column is JSONB. So we pass it as a []int64 and let Go serialize or cast.
	// DB wants JSONB.

	query := `
		INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
		VALUES ($1, $2, 'opted_in', NOW())
		ON CONFLICT (drive_id, student_id)
		DO UPDATE SET status = 'opted_in', updated_at = NOW()
	`
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return false, err.Error(), err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, query, driveID, studentID)
	if err != nil {
		return false, err.Error(), err
	}

	// Upsert roles: first delete old, then insert new
	_, err = tx.Exec(ctx, `DELETE FROM drive_application_roles WHERE drive_id = $1 AND student_id = $2`, driveID, studentID)
	if err != nil {
		return false, err.Error(), err
	}
	if len(roleIDs) > 0 {
		roleQuery := `INSERT INTO drive_application_roles (drive_id, student_id, role_id) VALUES ($1, $2, $3)`
		for _, roleID := range roleIDs {
			_, err = tx.Exec(ctx, roleQuery, driveID, studentID, roleID)
			if err != nil {
				return false, err.Error(), err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err.Error(), err
	}

	return true, "Successfully applied", nil
}

// WithdrawApplication removes or updates the application status to 'withdrawn' or 'opted_out'
func (r *ApplicationRepository) WithdrawApplication(ctx context.Context, studentID, driveID int64, reason string) error {
	// UPSERT: If exists update, if not insert 'opted_out'
	query := `
		INSERT INTO drive_applications (drive_id, student_id, status, applied_at, opt_out_reason)
		VALUES ($1, $2, 'opted_out', NOW(), $3)
		ON CONFLICT (drive_id, student_id) 
		DO UPDATE SET status = 'opted_out', opt_out_reason = $3, updated_at = NOW()
	`
	_, err := r.DB.Exec(ctx, query, driveID, studentID, reason)
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

// RequestToAttend records a request-to-attend for an ineligible student
func (r *ApplicationRepository) RequestToAttend(ctx context.Context, studentID, driveID int64, roleIDs []int64) error {
	query := `
		INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
		VALUES ($1, $2, 'request_to_attend', NOW())
		ON CONFLICT (drive_id, student_id) 
		DO UPDATE SET status = 'request_to_attend', updated_at = NOW()
	`
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, query, driveID, studentID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `DELETE FROM drive_application_roles WHERE drive_id = $1 AND student_id = $2`, driveID, studentID)
	if err != nil {
		return err
	}

	if len(roleIDs) > 0 {
		roleQuery := `INSERT INTO drive_application_roles (drive_id, student_id, role_id) VALUES ($1, $2, $3)`
		for _, roleID := range roleIDs {
			_, err = tx.Exec(ctx, roleQuery, driveID, studentID, roleID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

// GetStudentDriveRequests returns all drive requests made by a student
func (r *ApplicationRepository) GetStudentDriveRequests(ctx context.Context, studentID int64) ([]map[string]interface{}, error) {
	query := `
		SELECT da.drive_id, pd.company_name, da.status, da.applied_at, da.updated_at,
			COALESCE(da.remarks, ''),
			COALESCE(
				(SELECT string_agg(jr.role_name, ', ')
				 FROM drive_application_roles dar
                 JOIN job_roles jr ON dar.role_id = jr.id
				 WHERE dar.drive_id = pd.id AND dar.student_id = da.student_id
				), ''
			) as applied_role_names
		FROM drive_applications da
		JOIN placement_drives pd ON da.drive_id = pd.id
		WHERE da.student_id = $1 
		AND da.status IN ('request_to_attend', 'opted_in', 'rejected')
		ORDER BY da.applied_at DESC
	`
	rows, err := r.DB.Query(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []map[string]interface{}
	for rows.Next() {
		var driveID int64
		var companyName, status, adminRemarks, appliedRoleNames string
		var appliedAt, updatedAt time.Time
		if err := rows.Scan(&driveID, &companyName, &status, &appliedAt, &updatedAt,
			&adminRemarks, &appliedRoleNames); err != nil {
			return nil, err
		}

		statusLabel := "Pending"
		switch status {
		case "opted_in":
			statusLabel = "Approved"
		case "rejected":
			statusLabel = "Rejected"
		case "request_to_attend":
			statusLabel = "Pending"
		}

		requests = append(requests, map[string]interface{}{
			"drive_id":           driveID,
			"company_name":       companyName,
			"status":             status,
			"status_label":       statusLabel,
			"applied_at":         appliedAt.Format("2006-01-02 15:04"),
			"updated_at":         updatedAt.Format("2006-01-02 15:04"),
			"remarks":            adminRemarks,
			"applied_role_names": appliedRoleNames,
		})
	}
	if requests == nil {
		requests = []map[string]interface{}{}
	}
	return requests, nil
}
