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
func (r *DriveRepository) CreateDrive(ctx context.Context, drive models.PlacementDrive) error { // Changed drive to value type
	query := `
        INSERT INTO placement_drives (
            posted_by, company_name, job_role, job_description, location,
            drive_type, company_category, spoc_id, 
            ctc_min, ctc_max, ctc_display, stipend_min, stipend_max,
            min_cgpa, max_backlogs_allowed, 
            eligible_batches, eligible_departments, 
            rounds, attachments,
            drive_date, deadline_date,
            website, logo_url,
            status, created_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19,
            $20, $21, 
            $22, $23,
            'open', NOW()
        )
    `
	// Note: 'drive.DriveDate' needs careful handling, simplified here

	_, err := r.DB.Exec(ctx, query, // Changed to Exec
		drive.PostedBy, drive.CompanyName, drive.JobRole, drive.JobDescription, drive.Location,
		drive.DriveType, drive.CompanyCategory, drive.SpocID,
		drive.CtcMin, drive.CtcMax, drive.CtcDisplay, drive.StipendMin, drive.StipendMax,
		drive.MinCgpa, drive.MaxBacklogsAllowed,
		drive.EligibleBatches, drive.EligibleDepartments, // Note: eligible_branches maps to eligible_departments in query
		drive.Rounds, drive.Attachments, // Note: Rounds maps to rounds in query
		drive.DriveDate, drive.DeadlineDate,
		drive.Website, drive.LogoURL,
	)

	return err
}

// 2. List Drives (With Dynamic Filters!)
// This supports queries like: /api/drives?min_salary=500000&category=IT
func (r *DriveRepository) GetDrives(ctx context.Context, filters map[string]interface{}) ([]models.PlacementDrive, error) {
	// Start with the base query
	// Improved Query: Includes Applicant Count Subquery
	query := `
        SELECT 
            pd.id, pd.posted_by, pd.company_name, pd.job_role, pd.job_description, pd.location,
            pd.drive_type, pd.company_category, pd.spoc_id,
            pd.ctc_min, pd.ctc_max, pd.ctc_display, pd.stipend_min, pd.stipend_max,
            pd.min_cgpa, pd.max_backlogs_allowed, 
            COALESCE(pd.eligible_batches, '[]'::jsonb), COALESCE(pd.eligible_departments, '[]'::jsonb),
            COALESCE(pd.rounds, '[]'::jsonb), COALESCE(pd.attachments, '[]'::jsonb),
            pd.drive_date, pd.deadline_date, pd.website, pd.logo_url, pd.status, pd.created_at,
			(SELECT COUNT(*) FROM drive_applications da WHERE da.drive_id = pd.id) as applicant_count
        FROM placement_drives pd
        WHERE 1=1
    `

	var args []interface{}
	argCounter := 1

	// Dynamically append filters
	if val, ok := filters["category"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.company_category = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["min_salary"]; ok {
		// Find jobs where the MAX salary offered is at least this amount
		query += fmt.Sprintf(" AND pd.ctc_max >= $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["type"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.drive_type = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Filter by Department (Check if value exists in JSONB array)
	// eligible_departments is ["CSE", "ECE"]. Query checks if array contains "CSE".
	if val, ok := filters["department"]; ok && val != "" {
		query += fmt.Sprintf(" AND (pd.eligible_departments IS NULL OR pd.eligible_departments = '[]'::jsonb OR pd.eligible_departments @> to_jsonb($%d::text))", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Filter by Batch (Check if value exists in JSONB array)
	if val, ok := filters["batch"]; ok {
		query += fmt.Sprintf(" AND (pd.eligible_batches IS NULL OR pd.eligible_batches = '[]'::jsonb OR pd.eligible_batches @> to_jsonb($%d::int))", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Always sort by deadline (Urgency)
	query += ` ORDER BY pd.deadline_date ASC`

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
			&d.DriveType, &d.CompanyCategory, &d.SpocID,
			&d.CtcMin, &d.CtcMax, &d.CtcDisplay, &d.StipendMin, &d.StipendMax,
			&d.MinCgpa, &d.MaxBacklogsAllowed,
			&d.EligibleBatches, &d.EligibleDepartments,
			&d.Rounds, &d.Attachments,
			&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Status, &d.CreatedAt,
			&d.ApplicantCount,
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
	// [NEW] Joined with drive_applications to get status for THIS student
	queryDrives := `
        SELECT 
            pd.id, pd.posted_by, pd.company_name, pd.job_role, pd.job_description, pd.location, 
            pd.drive_type, pd.company_category, pd.spoc_id,
            pd.ctc_min, pd.ctc_max, pd.ctc_display, pd.stipend_min, pd.stipend_max,
            pd.min_cgpa, pd.max_backlogs_allowed, 
            COALESCE(pd.eligible_batches, '[]'::jsonb), COALESCE(pd.eligible_departments, '[]'::jsonb),
            COALESCE(pd.rounds, '[]'::jsonb), COALESCE(pd.attachments, '[]'::jsonb),
            pd.drive_date, pd.deadline_date, pd.website, pd.logo_url, pd.status, pd.created_at,
			COALESCE(da.status, '') as user_status
        FROM placement_drives pd
		LEFT JOIN drive_applications da ON pd.id = da.drive_id AND da.student_id = $1
        WHERE pd.status = 'open'
        AND pd.deadline_date > NOW()
        AND pd.min_cgpa <= $2
        AND pd.max_backlogs_allowed >= $3
        AND (pd.eligible_departments IS NULL OR pd.eligible_departments = 'null' OR pd.eligible_departments @> jsonb_build_array($4::text))
        AND (pd.eligible_batches IS NULL OR pd.eligible_batches = 'null' OR pd.eligible_batches @> jsonb_build_array($5::int))
        ORDER BY pd.deadline_date ASC
    `

	// Note: Params shifted because $1 is now studentID for the JOIN
	// $1 = studentID
	// $2 = cgpa
	// $3 = backlogs
	// $4 = dept
	// $5 = batch

	rows, err := r.DB.Query(ctx, queryDrives, studentID, cgpa, backlogs, dept, batch)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drives []models.PlacementDrive
	for rows.Next() {
		var d models.PlacementDrive
		err := rows.Scan(
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobRole, &d.JobDescription, &d.Location,
			&d.DriveType, &d.CompanyCategory, &d.SpocID,
			&d.CtcMin, &d.CtcMax, &d.CtcDisplay, &d.StipendMin, &d.StipendMax,
			&d.MinCgpa, &d.MaxBacklogsAllowed,
			&d.EligibleBatches, &d.EligibleDepartments,
			&d.Rounds, &d.Attachments,
			&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Status, &d.CreatedAt,
			&d.UserStatus, // [NEW]
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
            drive_type=$5, company_category=$6, spoc_id=$7,
            ctc_min=$8, ctc_max=$9, ctc_display=$10, stipend_min=$11, stipend_max=$12,
            min_cgpa=$13, max_backlogs_allowed=$14, 
            eligible_batches=$15, eligible_departments=$16, 

            rounds=$17, attachments=$18,
            drive_date=$19, deadline_date=$20,
            website=$21, logo_url=$22
        WHERE id = $23
    `
	// Note: We don't update 'posted_by' or 'created_at'
	_, err := r.DB.Exec(ctx, query,
		drive.CompanyName, drive.JobRole, drive.JobDescription, drive.Location,
		drive.DriveType, drive.CompanyCategory, drive.SpocID,
		drive.CtcMin, drive.CtcMax, drive.CtcDisplay, drive.StipendMin, drive.StipendMax,
		drive.MinCgpa, drive.MaxBacklogsAllowed,
		drive.EligibleBatches, drive.EligibleDepartments,
		drive.Rounds, drive.Attachments,
		drive.DriveDate, drive.DeadlineDate,
		drive.Website, drive.LogoURL,
		id,
	)
	return err
}

// 3.5 Get Drive By ID (Internal use for deletion/updates)
func (r *DriveRepository) GetDriveByID(ctx context.Context, id int64) (*models.PlacementDrive, error) {
	query := `
        SELECT
            id, posted_by, company_name, job_role, job_description, location,
            drive_type, company_category, spoc_id,
            ctc_min, ctc_max, ctc_display, stipend_min, stipend_max,
            min_cgpa, max_backlogs_allowed,
            COALESCE(eligible_batches, '[]'::jsonb), COALESCE(eligible_departments, '[]'::jsonb),
            COALESCE(rounds, '[]'::jsonb), COALESCE(attachments, '[]'::jsonb),
            drive_date, deadline_date, website, logo_url, status, created_at
        FROM placement_drives
        WHERE id = $1
    `
	var d models.PlacementDrive
	err := r.DB.QueryRow(ctx, query, id).Scan(
		&d.ID, &d.PostedBy, &d.CompanyName, &d.JobRole, &d.JobDescription, &d.Location,
		&d.DriveType, &d.CompanyCategory, &d.SpocID,
		&d.CtcMin, &d.CtcMax, &d.CtcDisplay, &d.StipendMin, &d.StipendMax,
		&d.MinCgpa, &d.MaxBacklogsAllowed,
		&d.EligibleBatches, &d.EligibleDepartments,
		&d.Rounds, &d.Attachments,
		&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Status, &d.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
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

// 4.5 Bulk Delete Drives
func (r *DriveRepository) BulkDeleteDrives(ctx context.Context, ids []int64) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}

	query := `DELETE FROM placement_drives WHERE id = ANY($1)`
	tag, err := r.DB.Exec(ctx, query, ids)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// 4.6 Get Drives By IDs (Internal use for bulk operations)
func (r *DriveRepository) GetDrivesByIDs(ctx context.Context, ids []int64) ([]models.PlacementDrive, error) {
	query := `
        SELECT 
            id, posted_by, company_name, job_role, job_description, location,
            drive_type, company_category, spoc_id,
            ctc_min, ctc_max, ctc_display, stipend_min, stipend_max,
            min_cgpa, max_backlogs_allowed, 
            COALESCE(eligible_batches, '[]'::jsonb), COALESCE(eligible_departments, '[]'::jsonb),
            COALESCE(rounds, '[]'::jsonb), COALESCE(attachments, '[]'::jsonb),
            drive_date, deadline_date, website, logo_url, status, created_at
        FROM placement_drives 
        WHERE id = ANY($1)
    `

	rows, err := r.DB.Query(ctx, query, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drives []models.PlacementDrive
	for rows.Next() {
		var d models.PlacementDrive
		err := rows.Scan(
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobRole, &d.JobDescription, &d.Location,
			&d.DriveType, &d.CompanyCategory, &d.SpocID,
			&d.CtcMin, &d.CtcMax, &d.CtcDisplay, &d.StipendMin, &d.StipendMax,
			&d.MinCgpa, &d.MaxBacklogsAllowed,
			&d.EligibleBatches, &d.EligibleDepartments,
			&d.Rounds, &d.Attachments,
			&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Status, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		drives = append(drives, d)
	}
	return drives, nil
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
               drive_date, deadline_date, status, company_category, logo_url
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
			&d.DriveType, &d.DriveDate, &d.DeadlineDate, &d.Status, &d.CompanyCategory, &d.LogoURL); err != nil {
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

// GetDriveApplicants fetches all students applied to a drive
func (r *DriveRepository) GetDriveApplicants(ctx context.Context, driveID int64) ([]models.DriveApplicant, error) {
	query := `
        SELECT 
            u.id, sp.full_name, sp.register_number, u.email, sp.department, 
            COALESCE(sa.ug_cgpa, 0.0), da.status, COALESCE(sd.resume_url, ''), da.applied_at
        FROM drive_applications da
        JOIN users u ON da.student_id = u.id
        JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN student_academics sa ON u.id = sa.user_id
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE da.drive_id = $1
        ORDER BY da.applied_at DESC
    `

	rows, err := r.DB.Query(ctx, query, driveID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applicants := []models.DriveApplicant{}
	for rows.Next() {
		var a models.DriveApplicant
		var appliedAt time.Time
		err := rows.Scan(
			&a.StudentID, &a.FullName, &a.RegisterNumber, &a.Email, &a.Department,
			&a.Cgpa, &a.Status, &a.ResumeURL, &appliedAt,
		)
		if err != nil {
			return nil, err
		}
		a.AppliedAt = appliedAt.Format("2006-01-02 15:04")
		applicants = append(applicants, a)
	}
	return applicants, nil
}

// GetEligibleStudentTokens fetches FCM tokens of students matching drive criteria
func (r *DriveRepository) GetEligibleStudentTokens(ctx context.Context, drive models.PlacementDrive) ([]string, error) {
	// Construct query based on drive eligibility
	// Constraints: MinCGPA, MaxBacklogs, Dept, Batch
	query := `
		SELECT u.fcm_token 
		FROM users u
		JOIN student_personal sp ON u.id = sp.user_id
		LEFT JOIN student_academics sa ON u.id = sa.user_id
		WHERE u.role = 'student' 
		AND u.is_active = true 
		AND u.fcm_token IS NOT NULL 
		AND u.fcm_token != ''
		AND COALESCE(sa.ug_cgpa, 0) >= $1
		AND COALESCE(sa.current_backlogs, 0) <= $2
		AND (sp.placement_willingness IS NULL OR sp.placement_willingness = 'Interested')
		AND ($3::jsonb IS NULL OR $3::jsonb = '[]'::jsonb OR (sp.department IS NOT NULL AND $3::jsonb @> jsonb_build_array(sp.department)))
		AND ($4::jsonb IS NULL OR $4::jsonb = '[]'::jsonb OR (sp.batch_year IS NOT NULL AND $4::jsonb @> jsonb_build_array(sp.batch_year)))
	`

	// Note: We use jsonb containment to check if the student's dept/batch is in the allowed list
	// $3 is drive.EligibleDepartments (as JSON)
	// $4 is drive.EligibleBatches (as JSON)

	rows, err := r.DB.Query(ctx, query,
		drive.MinCgpa,
		drive.MaxBacklogsAllowed,
		drive.EligibleDepartments,
		drive.EligibleBatches,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []string
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err == nil {
			tokens = append(tokens, token)
		}
	}
	return tokens, nil
}

// GetEligibleStudentPhoneNumbers fetches mobile numbers of eligible students
func (r *DriveRepository) GetEligibleStudentPhoneNumbers(ctx context.Context, drive models.PlacementDrive) ([]string, error) {
	query := `
		SELECT sp.mobile_number 
		FROM users u
		JOIN student_personal sp ON u.id = sp.user_id
		LEFT JOIN student_academics sa ON u.id = sa.user_id
		WHERE u.role = 'student' 
		AND u.is_active = true 
		AND sp.mobile_number IS NOT NULL 
		AND sp.mobile_number != '' 
		AND sp.mobile_number != 'NA'
		AND COALESCE(sa.ug_cgpa, 0) >= $1
		AND COALESCE(sa.current_backlogs, 0) <= $2
		AND (sp.placement_willingness IS NULL OR sp.placement_willingness = 'Interested')
		AND ($3::jsonb IS NULL OR $3::jsonb = '[]'::jsonb OR (sp.department IS NOT NULL AND $3::jsonb @> jsonb_build_array(sp.department)))
		AND ($4::jsonb IS NULL OR $4::jsonb = '[]'::jsonb OR (sp.batch_year IS NOT NULL AND $4::jsonb @> jsonb_build_array(sp.batch_year)))
	`

	rows, err := r.DB.Query(ctx, query,
		drive.MinCgpa,
		drive.MaxBacklogsAllowed,
		drive.EligibleDepartments,
		drive.EligibleBatches,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var numbers []string
	for rows.Next() {
		var num string
		if err := rows.Scan(&num); err == nil {
			numbers = append(numbers, num)
		}
	}
	return numbers, nil
}
