package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DriveRepository struct {
	DB *pgxpool.Pool
}

func NewDriveRepository(db *pgxpool.Pool) *DriveRepository {
	return &DriveRepository{DB: db}
}

// 1. Create Drive (Admin Only)
func (r *DriveRepository) CreateDrive(ctx context.Context, drive *models.PlacementDrive) error {
	query := `
        INSERT INTO placement_drives (
            posted_by, company_name, job_role, job_description, location,
            drive_type, company_category, ctc_min, ctc_max, ctc_display,
            min_cgpa, max_backlogs_allowed, drive_date, deadline_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'open')
        RETURNING id, created_at
    `
	// Note: 'drive.DriveDate' needs careful handling, simplified here
	fmt.Println(drive)

	err := r.DB.QueryRow(ctx, query,
		drive.PostedBy, drive.CompanyName, drive.JobRole, drive.JobDescription, drive.Location,
		drive.DriveType, drive.CompanyCategory, drive.CtcMin, drive.CtcMax, drive.CtcDisplay,
		drive.MinCgpa, drive.MaxBacklogsAllowed, drive.DriveDate, drive.DeadlineDate,
	).Scan(&drive.ID, &drive.CreatedAt)

	return err
}

// 2. List Drives (With Dynamic Filters!)
// This supports queries like: /api/drives?min_salary=500000&category=IT
func (r *DriveRepository) GetDrives(ctx context.Context, filters map[string]interface{}) ([]models.PlacementDrive, error) {
	// Start with the base query
	query := `
        SELECT 
            id, posted_by, company_name, job_role, job_description, location, 
            drive_type, company_category, ctc_min, ctc_max, ctc_display, 
            min_cgpa, max_backlogs_allowed, drive_date, deadline_date, status, created_at
        FROM placement_drives 
        WHERE 1=1
    `

	var args []interface{}
	argCounter := 1

	// Dynamically append filters
	if val, ok := filters["category"]; ok && val != "" {
		query += fmt.Sprintf(" AND company_category = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["min_salary"]; ok {
		// Find jobs where the MAX salary offered is at least this amount
		query += fmt.Sprintf(" AND ctc_max >= $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["type"]; ok && val != "" {
		query += fmt.Sprintf(" AND drive_type = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Always sort by deadline (Urgency)
	query += ` ORDER BY deadline_date ASC`

	rows, err := r.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var drives []models.PlacementDrive
	for rows.Next() {
		var d models.PlacementDrive
		// We scan only the columns requested in the SELECT above
		err := rows.Scan(
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobRole, &d.JobDescription, &d.Location,
			&d.DriveType, &d.CompanyCategory, &d.CtcMin, &d.CtcMax, &d.CtcDisplay,
			&d.MinCgpa, &d.MaxBacklogsAllowed, &d.DriveDate, &d.DeadlineDate, &d.Status, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		drives = append(drives, d)
	}
	return drives, nil

}

// 2.5 Get Eligible Drives (For Students)
func (r *DriveRepository) GetEligibleDrives(ctx context.Context, studentID int64) ([]models.PlacementDrive, error) {
	// A. First, fetch the student's academic and personal profile
	// We need: Department, Batch Year, CGPA, Backlogs
	queryStudent := `
        SELECT 
            sp.department, sp.batch_year, 
            COALESCE(sa.ug_cgpa, 0.0), COALESCE(sa.current_backlogs, 0)
        FROM student_personal sp
        LEFT JOIN student_academics sa ON sp.user_id = sa.user_id
        WHERE sp.user_id = $1
    `
	var dept string
	var batch int
	var cgpa float64
	var backlogs int

	err := r.DB.QueryRow(ctx, queryStudent, studentID).Scan(&dept, &batch, &cgpa, &backlogs)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch student profile: %v", err)
	}

	// B. Query Drives with Eligibility Filters
	// Logic:
	// 1. Min CGPA <= Student CGPA
	// 2. Max Backlogs >= Student Backlogs
	// 3. Eligible Branches contains Student Dept (JSONB)
	// 4. Eligible Batch contains Student Batch (JSONB)
	// 5. Status is 'open'
	// 6. Not expired (deadline > now)

	queryDrives := `
        SELECT 
            id, posted_by, company_name, job_role, job_description, location, 
            drive_type, company_category, ctc_min, ctc_max, ctc_display, 
            min_cgpa, max_backlogs_allowed, drive_date, deadline_date, status, created_at
        FROM placement_drives 
        WHERE status = 'open'
        AND deadline_date > NOW()
        AND min_cgpa <= $1
        AND max_backlogs_allowed >= $2
        AND (eligible_branches IS NULL OR eligible_branches @> to_jsonb($3::text))
        AND (eligible_batch_years IS NULL OR eligible_batch_years @> to_jsonb($4::int))
        ORDER BY deadline_date ASC
    `

	rows, err := r.DB.Query(ctx, queryDrives, cgpa, backlogs, dept, batch)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drives []models.PlacementDrive
	for rows.Next() {
		var d models.PlacementDrive
		err := rows.Scan(
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobRole, &d.JobDescription, &d.Location,
			&d.DriveType, &d.CompanyCategory, &d.CtcMin, &d.CtcMax, &d.CtcDisplay,
			&d.MinCgpa, &d.MaxBacklogsAllowed, &d.DriveDate, &d.DeadlineDate, &d.Status, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		drives = append(drives, d)
	}
	return drives, nil
}

// 3. Update Drive (Admin: Extend Deadline, Change CTC, etc.)
func (r *DriveRepository) UpdateDrive(ctx context.Context, id int64, drive *models.PlacementDrive) error {
	query := `
        UPDATE placement_drives 
        SET company_name=$1, job_role=$2, job_description=$3, location=$4,
            drive_type=$5, company_category=$6, ctc_min=$7, ctc_max=$8, ctc_display=$9,
            min_cgpa=$10, max_backlogs_allowed=$11, drive_date=$12, deadline_date=$13
        WHERE id = $14
    `
	// Note: We don't update 'posted_by' or 'created_at'
	_, err := r.DB.Exec(ctx, query,
		drive.CompanyName, drive.JobRole, drive.JobDescription, drive.Location,
		drive.DriveType, drive.CompanyCategory, drive.CtcMin, drive.CtcMax, drive.CtcDisplay,
		drive.MinCgpa, drive.MaxBacklogsAllowed, drive.DriveDate, drive.DeadlineDate,
		id,
	)
	return err
}

// 4. Delete Drive (Hard Delete - Cascades to applications if configured in DB)
func (r *DriveRepository) DeleteDrive(ctx context.Context, id int64) error {
	query := `DELETE FROM placement_drives WHERE id = $1`
	commandTag, err := r.DB.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return fmt.Errorf("drive not found")
	}
	return nil
}

// 5. Admin Force Add (Bypasses Deadline & Eligibility Checks)
func (r *DriveRepository) AdminForceRegister(ctx context.Context, driveID, studentID int64) error {
	// We insert directly, ignoring the Stored Procedure checks
	// ON CONFLICT: If they are already applied, do nothing (idempotent)
	query := `
        INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
        VALUES ($1, $2, 'opted_in', NOW())
        ON CONFLICT (drive_id, student_id) 
        DO UPDATE SET status = 'opted_in' -- Reactivate if they were 'withdrawn'
    `
	_, err := r.DB.Exec(ctx, query, driveID, studentID)
	return err
}

// AutoCloseExpiredDrives checks for any drives past their deadline and closes them.
// It returns the number of drives closed.
func (r *DriveRepository) AutoCloseExpiredDrives(ctx context.Context) (int64, error) {
	// The "Guru" Query:
	// It is atomic, fast, and uses the Database's own clock (CURRENT_TIMESTAMP)
	// to avoid timezone mismatches between your Go server and Postgres.
	query := `
        UPDATE placement_drives 
        SET status = 'closed' 
        WHERE status = 'open' 
        AND deadline_date < CURRENT_TIMESTAMP
    `

	result, err := r.DB.Exec(ctx, query)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected(), nil
}

// GetHomePageDrives returns drives organized by category
func (r *DriveRepository) GetHomePageDrives(ctx context.Context) (map[string][]models.PlacementDrive, error) {
	// Fetch non-cancelled drives
	query := `
        SELECT id, company_name, job_role, ctc_display, drive_type, 
               drive_date, deadline_date, status, company_category
        FROM placement_drives 
        WHERE status != 'cancelled'
        ORDER BY deadline_date ASC
    `
	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize map
	categories := map[string][]models.PlacementDrive{
		"upcoming":  {},
		"ongoing":   {},
		"completed": {},
		"on_hold":   {},
	}

	now := time.Now()

	for rows.Next() {
		var d models.PlacementDrive
		// Scan fields (Ensure your struct has these fields)
		if err := rows.Scan(&d.ID, &d.CompanyName, &d.JobRole, &d.CtcDisplay,
			&d.DriveType, &d.DriveDate, &d.DeadlineDate, &d.Status, &d.CompanyCategory); err != nil {
			return nil, err
		}

		// Logic for categorization
		switch d.Status {
		case "on_hold":
			categories["on_hold"] = append(categories["on_hold"], d)
		case "completed", "closed":
			categories["completed"] = append(categories["completed"], d)
		case "open":
			// Check dates for Upcoming vs Ongoing
			// Note: pgtype.Date needs conversion. Assuming you handled that in Scan or model.
			// For simplicity, let's compare the deadline.

			// If drive date is in future (> 24 hours from now)
			if d.DriveDate.Time.After(now.Add(5 * 24 * time.Hour)) {
				categories["upcoming"] = append(categories["upcoming"], d)
			} else {
				// It's happening now or very soon
				categories["ongoing"] = append(categories["ongoing"], d)
			}
		}
	}
	return categories, nil
}

func (r *DriveRepository) UpdateApplicationStatus(ctx context.Context, driveID, studentID int64, status string) error {
	query := `
        UPDATE drive_applications 
        SET status = $1, updated_at = NOW() 
        WHERE drive_id = $2 AND student_id = $3
    `
	_, err := r.DB.Exec(ctx, query, status, driveID, studentID)
	return err
}
