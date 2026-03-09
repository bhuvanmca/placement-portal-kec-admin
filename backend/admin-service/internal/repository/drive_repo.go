package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DriveRepository struct {
	DB *pgxpool.Pool
}

func NewDriveRepository(db *pgxpool.Pool) *DriveRepository {
	return &DriveRepository{DB: db}
}

// 1. Create Drive (Admin Only)
func (r *DriveRepository) CreateDrive(ctx context.Context, drive models.PlacementDrive) error {
	query := `
        INSERT INTO placement_drives (
            posted_by, company_name, job_description,
            drive_type, company_category, spoc_id,
            offer_type, allow_placed_candidates,
            min_cgpa, max_backlogs_allowed, 
            
            tenth_percentage, twelfth_percentage, ug_min_cgpa, pg_min_cgpa,
            use_aggregate, aggregate_percentage,

            rounds, attachments,
            drive_date, deadline_date,
            website, logo_url, location, location_type,
            status, created_at
        ) VALUES (
            $1, $2, $3,
            $4, $5, $6,
            $7, $8,
            
            $9, $10, $11, $12,
            $13, $14,
            $15, $16,
            $17, $18,
            $19, $20,
            $21, $22, $23, $24,
            'open', NOW()
        ) RETURNING id
    `
	// Ensure LocationType has a valid default
	if drive.LocationType == "" {
		drive.LocationType = "On-Site"
	}

	var driveID int64
	err := r.DB.QueryRow(ctx, query,
		drive.PostedBy, drive.CompanyName, drive.JobDescription,
		drive.DriveType, drive.CompanyCategory, drive.SpocID,
		drive.OfferType, drive.AllowPlacedCandidates,
		drive.MinCgpa, drive.MaxBacklogsAllowed,

		drive.TenthPercentage, drive.TwelfthPercentage, drive.UGMinCGPA, drive.PGMinCGPA,
		drive.UseAggregate, drive.AggregatePercentage,

		drive.Rounds, drive.Attachments,
		drive.DriveDate, drive.DeadlineDate,
		drive.Website, drive.LogoURL, drive.Location, drive.LocationType,
	).Scan(&driveID)

	if err != nil {
		return err
	}

	// Insert Eligible Batches
	if len(drive.EligibleBatches) > 0 {
		batchQuery := `INSERT INTO drive_eligible_batches (drive_id, batch_year) VALUES ($1, $2)`
		for _, batch := range drive.EligibleBatches {
			_, err := r.DB.Exec(ctx, batchQuery, driveID, batch)
			if err != nil {
				return fmt.Errorf("failed to insert eligible batch %d: %v", batch, err)
			}
		}
	}

	// Insert Eligible Departments
	if len(drive.EligibleDepartments) > 0 {
		deptQuery := `INSERT INTO drive_eligible_departments (drive_id, department_code) VALUES ($1, $2)`
		for _, dept := range drive.EligibleDepartments {
			_, err := r.DB.Exec(ctx, deptQuery, driveID, dept)
			if err != nil {
				return fmt.Errorf("failed to insert eligible department %s: %v", dept, err)
			}
		}
	}

	// Insert Job Roles
	if len(drive.Roles) > 0 {
		roleQuery := `
			INSERT INTO job_roles (drive_id, role_name, ctc, salary, stipend)
			VALUES ($1, $2, $3, $4, $5)
		`
		for _, role := range drive.Roles {
			_, err := r.DB.Exec(ctx, roleQuery, driveID, role.RoleName, role.Ctc, role.Salary, role.Stipend)
			if err != nil {
				return fmt.Errorf("failed to insert role %s: %v", role.RoleName, err)
			}
		}
	}

	return nil
}

// --- Automated State Management ---
func (r *DriveRepository) TriggerAutoStatusUpdates(ctx context.Context) {
	// 1. Close drives that have passed deadline
	r.DB.Exec(ctx, "UPDATE placement_drives SET status = 'closed' WHERE status = 'open' AND deadline_date < NOW()")

	// 2. Complete drives safely after drive date (give a 1-day buffer)
	r.DB.Exec(ctx, "UPDATE placement_drives SET status = 'completed' WHERE status NOT IN ('completed', 'cancelled', 'draft') AND drive_date + INTERVAL '1 day' < NOW()")
}

// 2. List Drives (With Dynamic Filters!)
// This supports queries like: /api/drives?min_salary=500000&category=IT
func (r *DriveRepository) GetDrives(ctx context.Context, filters map[string]interface{}) ([]models.PlacementDrive, error) {
	r.TriggerAutoStatusUpdates(ctx)

	// Start with the base query
	// Improved Query: Includes Applicant Count Subquery & Roles
	query := `
        SELECT 
            pd.id, pd.posted_by, pd.company_name, pd.job_description,
            pd.drive_type, pd.company_category, pd.spoc_id,
            pd.offer_type, pd.allow_placed_candidates,
            pd.min_cgpa, pd.max_backlogs_allowed, 
            pd.tenth_percentage, pd.twelfth_percentage, pd.ug_min_cgpa, pd.pg_min_cgpa,
            pd.use_aggregate, pd.aggregate_percentage,
            COALESCE((SELECT jsonb_agg(deb.batch_year) FROM drive_eligible_batches deb WHERE deb.drive_id = pd.id), '[]'::jsonb) as eligible_batches, 
            COALESCE((SELECT jsonb_agg(ded.department_code) FROM drive_eligible_departments ded WHERE ded.drive_id = pd.id), '[]'::jsonb) as eligible_departments,
            COALESCE(pd.rounds, '[]'::jsonb), COALESCE(pd.attachments, '[]'::jsonb),
            pd.drive_date, pd.deadline_date, pd.website, pd.logo_url, pd.location, pd.location_type, pd.status, pd.created_at,
			(SELECT COUNT(*) FROM drive_applications da WHERE da.drive_id = pd.id) as applicant_count,
			COALESCE((SELECT jsonb_agg(jr) FROM job_roles jr WHERE jr.drive_id = pd.id), '[]'::jsonb) as roles
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
		// Filter by salary in job_roles
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.salary >= $%d)", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["type"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.drive_type = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Filter by Department (Check if value exists in junction table)
	if val, ok := filters["department"]; ok && val != "" {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM drive_eligible_departments ded WHERE ded.drive_id = pd.id AND ded.department_code = $%d)", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Filter by Batch (Check if value exists in junction table)
	if val, ok := filters["batch"]; ok {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM drive_eligible_batches deb WHERE deb.drive_id = pd.id AND deb.batch_year = $%d)", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Filter by Search Term
	if val, ok := filters["search"]; ok && val != "" {
		searchTerm := fmt.Sprintf("%%%v%%", val)
		query += fmt.Sprintf(" AND (pd.company_name ILIKE $%d OR pd.job_description ILIKE $%d OR EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.role_name ILIKE $%d))", argCounter, argCounter, argCounter)
		args = append(args, searchTerm)
		argCounter++
	}

	// Filter by Search Term
	if val, ok := filters["search"]; ok && val != "" {
		searchTerm := fmt.Sprintf("%%%v%%", val)
		query += fmt.Sprintf(" AND (pd.company_name ILIKE $%d OR pd.job_description ILIKE $%d OR EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.role_name ILIKE $%d))", argCounter, argCounter, argCounter)
		args = append(args, searchTerm)
		argCounter++
	}

	// Always sort by created_at DESC (Most recent first)
	query += ` ORDER BY pd.created_at DESC`

	// Pagination
	if val, ok := filters["limit"].(int); ok && val > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argCounter)
		args = append(args, val)
		argCounter++
	}
	if val, ok := filters["offset"].(int); ok && val >= 0 {
		query += fmt.Sprintf(" OFFSET $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

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
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobDescription,
			&d.DriveType, &d.CompanyCategory, &d.SpocID,
			&d.OfferType, &d.AllowPlacedCandidates,
			&d.MinCgpa, &d.MaxBacklogsAllowed,
			&d.TenthPercentage, &d.TwelfthPercentage, &d.UGMinCGPA, &d.PGMinCGPA,
			&d.UseAggregate, &d.AggregatePercentage,
			&d.EligibleBatches, &d.EligibleDepartments,
			&d.Rounds, &d.Attachments,
			&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Location, &d.LocationType, &d.Status, &d.CreatedAt,
			&d.ApplicantCount, &d.Roles,
		)
		if err != nil {
			return nil, err
		}

		drives = append(drives, d)
	}
	return drives, nil

}

// 2.5 Get Drives for Student (Filtered by Batch + Department only)
// Eligibility is computed per-drive and returned as `is_eligible`
func (r *DriveRepository) GetEligibleDrives(ctx context.Context, studentID int64, filters map[string]interface{}) ([]models.PlacementDrive, error) {
	// A. First, fetch the student's academic and personal profile
	queryStudent := `
        SELECT 
            sp.department, COALESCE(dm.type, 'UG'), sp.batch_year, 
            COALESCE(d_ug.cgpa, 0.0), COALESCE(d_pg.cgpa, 0.0),
            COALESCE(sch.current_backlogs, 0),
            COALESCE(sch.tenth_mark, 0.0), COALESCE(sch.twelfth_mark, 0.0)
        FROM student_personal sp
        LEFT JOIN departments dm ON sp.department = dm.code
        LEFT JOIN student_degrees d_ug ON sp.user_id = d_ug.user_id AND d_ug.degree_level = 'UG'
        LEFT JOIN student_degrees d_pg ON sp.user_id = d_pg.user_id AND d_pg.degree_level = 'PG'
        LEFT JOIN student_schooling sch ON sp.user_id = sch.user_id
        WHERE sp.user_id = $1
    `
	var dept, deptType string
	var batch int
	var ugCgpa, pgCgpa float64
	var backlogs int
	var tenthMark, twelfthMark float64

	err := r.DB.QueryRow(ctx, queryStudent, studentID).Scan(
		&dept, &deptType, &batch, &ugCgpa, &pgCgpa, &backlogs, &tenthMark, &twelfthMark,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch student profile: %v", err)
	}

	// B. Query Drives filtered by Batch + Department ONLY
	// Eligibility (CGPA, backlogs, academic scores) is computed in SELECT, not filtered.
	queryDrives := `
        SELECT 
            pd.id, pd.posted_by, pd.company_name, pd.job_description,
            pd.drive_type, pd.company_category, pd.spoc_id,
            pd.offer_type, pd.allow_placed_candidates,
            pd.min_cgpa, pd.max_backlogs_allowed, 
            pd.tenth_percentage, pd.twelfth_percentage, pd.ug_min_cgpa, pd.pg_min_cgpa,
            pd.use_aggregate, pd.aggregate_percentage,
            COALESCE((SELECT jsonb_agg(deb.batch_year) FROM drive_eligible_batches deb WHERE deb.drive_id = pd.id), '[]'::jsonb), 
            COALESCE((SELECT jsonb_agg(ded.department_code) FROM drive_eligible_departments ded WHERE ded.drive_id = pd.id), '[]'::jsonb),
            COALESCE(pd.rounds, '[]'::jsonb), COALESCE(pd.attachments, '[]'::jsonb),
            pd.drive_date, pd.deadline_date, pd.website, pd.logo_url, pd.location, pd.location_type, pd.status, pd.created_at,
			COALESCE(da.status, '') as user_status,
			COALESCE(da.remarks, '') as user_remarks,
			COALESCE(s.name, '') as spoc_name, COALESCE(s.designation, '') as spoc_designation,
			COALESCE((SELECT jsonb_agg(jr) FROM job_roles jr WHERE jr.drive_id = pd.id), '[]'::jsonb) as roles,
			COALESCE((SELECT jsonb_agg(dar.role_id) FROM drive_application_roles dar WHERE dar.drive_id = pd.id AND dar.student_id = $1), '[]'::jsonb) as user_applied_role_ids,
			COALESCE(da.opt_out_reason, '') as user_opt_out_reason,
			-- Compute eligibility: student must meet ALL academic criteria set by the drive
			(
				COALESCE($2::numeric, 0) >= COALESCE(pd.min_cgpa, 0)
				AND COALESCE($3::int, 0) <= COALESCE(pd.max_backlogs_allowed, 99)
				AND (pd.tenth_percentage IS NULL OR pd.tenth_percentage = 0 OR COALESCE($4::numeric, 0) >= pd.tenth_percentage)
				AND (pd.twelfth_percentage IS NULL OR pd.twelfth_percentage = 0 OR COALESCE($5::numeric, 0) >= pd.twelfth_percentage)
				AND (pd.ug_min_cgpa IS NULL OR pd.ug_min_cgpa = 0 OR COALESCE($2::numeric, 0) >= pd.ug_min_cgpa)
				AND ($9::text != 'PG' OR pd.pg_min_cgpa IS NULL OR pd.pg_min_cgpa = 0 OR COALESCE($6::numeric, 0) >= pd.pg_min_cgpa)
			) as is_eligible
        FROM placement_drives pd
		LEFT JOIN drive_applications da ON pd.id = da.drive_id AND da.student_id = $1
		LEFT JOIN spocs s ON pd.spoc_id = s.id
        WHERE pd.status IN ('open', 'closed', 'completed', 'cancelled', 'on_hold')
        AND (NOT EXISTS (SELECT 1 FROM drive_eligible_departments WHERE drive_id = pd.id) OR EXISTS (SELECT 1 FROM drive_eligible_departments WHERE drive_id = pd.id AND department_code = $7::text))
        AND (NOT EXISTS (SELECT 1 FROM drive_eligible_batches WHERE drive_id = pd.id) OR EXISTS (SELECT 1 FROM drive_eligible_batches WHERE drive_id = pd.id AND batch_year = $8::int))
		AND (pd.allow_placed_candidates = TRUE OR NOT EXISTS (SELECT 1 FROM drive_applications da2 WHERE da2.student_id = $1 AND da2.status = 'placed'))
    `

	args := []interface{}{studentID, ugCgpa, backlogs, tenthMark, twelfthMark, pgCgpa, dept, batch, deptType}
	argCounter := 10

	// Filters
	if val, ok := filters["search"]; ok && val != "" {
		searchTerm := fmt.Sprintf("%%%v%%", val)
		queryDrives += fmt.Sprintf(" AND (pd.company_name ILIKE $%d OR pd.job_description ILIKE $%d OR EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.role_name ILIKE $%d))", argCounter, argCounter, argCounter)
		args = append(args, searchTerm)
		argCounter++
	}

	if val, ok := filters["category"]; ok && val != "" {
		queryDrives += fmt.Sprintf(" AND pd.company_category = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["type"]; ok && val != "" {
		queryDrives += fmt.Sprintf(" AND pd.drive_type = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	queryDrives += ` ORDER BY pd.created_at DESC`

	// Pagination
	if val, ok := filters["limit"].(int); ok && val > 0 {
		queryDrives += fmt.Sprintf(" LIMIT $%d", argCounter)
		args = append(args, val)
		argCounter++
	}
	if val, ok := filters["offset"].(int); ok && val >= 0 {
		queryDrives += fmt.Sprintf(" OFFSET $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	rows, err := r.DB.Query(ctx, queryDrives, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drives []models.PlacementDrive
	for rows.Next() {
		var d models.PlacementDrive
		err := rows.Scan(
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobDescription,
			&d.DriveType, &d.CompanyCategory, &d.SpocID,
			&d.OfferType, &d.AllowPlacedCandidates,
			&d.MinCgpa, &d.MaxBacklogsAllowed,
			&d.TenthPercentage, &d.TwelfthPercentage, &d.UGMinCGPA, &d.PGMinCGPA,
			&d.UseAggregate, &d.AggregatePercentage,
			&d.EligibleBatches, &d.EligibleDepartments,
			&d.Rounds, &d.Attachments,
			&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Location, &d.LocationType, &d.Status, &d.CreatedAt,
			&d.UserStatus,
			&d.UserRemarks,
			&d.SpocName, &d.SpocDesignation,
			&d.Roles,
			&d.UserAppliedRoleIDs,
			&d.UserOptOutReason,
			&d.IsEligible,
		)
		if err != nil {
			return nil, err
		}
		drives = append(drives, d)
	}
	return drives, nil
}

func (r *DriveRepository) GetEligibleDrivesCount(ctx context.Context, studentID int64, filters map[string]interface{}) (int, error) {
	// Need student profile for filtering by Dept + Batch
	queryStudent := `SELECT department, batch_year FROM student_personal WHERE user_id = $1`
	var dept string
	var batch int
	err := r.DB.QueryRow(ctx, queryStudent, studentID).Scan(&dept, &batch)
	if err != nil {
		return 0, err
	}

	query := `
        SELECT COUNT(*)
        FROM placement_drives pd
        WHERE pd.status IN ('open', 'closed', 'completed', 'cancelled', 'on_hold')
        AND (NOT EXISTS (SELECT 1 FROM drive_eligible_departments WHERE drive_id = pd.id) OR EXISTS (SELECT 1 FROM drive_eligible_departments WHERE drive_id = pd.id AND department_code = $1))
        AND (NOT EXISTS (SELECT 1 FROM drive_eligible_batches WHERE drive_id = pd.id) OR EXISTS (SELECT 1 FROM drive_eligible_batches WHERE drive_id = pd.id AND batch_year = $2))
		AND (pd.allow_placed_candidates = TRUE OR NOT EXISTS (SELECT 1 FROM drive_applications da2 WHERE da2.student_id = $3 AND da2.status = 'placed'))
    `
	args := []interface{}{dept, batch, studentID}
	argCounter := 4

	// Filters
	if val, ok := filters["search"]; ok && val != "" {
		searchTerm := fmt.Sprintf("%%%v%%", val)
		query += fmt.Sprintf(" AND (pd.company_name ILIKE $%d OR pd.job_description ILIKE $%d OR EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.role_name ILIKE $%d))", argCounter, argCounter, argCounter)
		args = append(args, searchTerm)
		argCounter++
	}

	if val, ok := filters["category"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.company_category = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["type"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.drive_type = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	var count int
	err = r.DB.QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}

// 3. Update Drive (Admin: Extend Deadline, Change CTC, etc.)
func (r *DriveRepository) UpdateDrive(ctx context.Context, id int64, drive *models.PlacementDrive) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
        UPDATE placement_drives 
        SET company_name=$1, job_description=$2,
            drive_type=$3, company_category=$4, spoc_id=$5,
            offer_type=$6, allow_placed_candidates=$7,
            min_cgpa=$8, max_backlogs_allowed=$9, 
            
            tenth_percentage=$10, twelfth_percentage=$11, ug_min_cgpa=$12, pg_min_cgpa=$13,
            use_aggregate=$14, aggregate_percentage=$15,

            rounds=$16, attachments=$17,
            drive_date=$18, deadline_date=$19,
            website=$20, logo_url=$21, location=$22, location_type=$23,
            status=$24
        WHERE id = $25
    `
	// Note: We don't update 'posted_by' or 'created_at'
	// ...
	_, err = tx.Exec(ctx, query,
		drive.CompanyName, drive.JobDescription,
		drive.DriveType, drive.CompanyCategory, drive.SpocID,
		drive.OfferType, drive.AllowPlacedCandidates,
		drive.MinCgpa, drive.MaxBacklogsAllowed,

		drive.TenthPercentage, drive.TwelfthPercentage, drive.UGMinCGPA, drive.PGMinCGPA,
		drive.UseAggregate, drive.AggregatePercentage,

		drive.Rounds, drive.Attachments,
		drive.DriveDate, drive.DeadlineDate,
		drive.Website, drive.LogoURL, drive.Location, drive.LocationType,
		drive.Status,
		id,
	)
	if err != nil {
		return err
	}

	// Update Eligible Batches
	_, err = tx.Exec(ctx, "DELETE FROM drive_eligible_batches WHERE drive_id=$1", id)
	if err != nil {
		return fmt.Errorf("failed to delete old eligible batches: %v", err)
	}
	if len(drive.EligibleBatches) > 0 {
		batchQuery := `INSERT INTO drive_eligible_batches (drive_id, batch_year) VALUES ($1, $2)`
		for _, batch := range drive.EligibleBatches {
			_, err := tx.Exec(ctx, batchQuery, id, batch)
			if err != nil {
				return fmt.Errorf("failed to insert eligible batch %d: %v", batch, err)
			}
		}
	}

	// Update Eligible Departments
	_, err = tx.Exec(ctx, "DELETE FROM drive_eligible_departments WHERE drive_id=$1", id)
	if err != nil {
		return fmt.Errorf("failed to delete old eligible departments: %v", err)
	}
	if len(drive.EligibleDepartments) > 0 {
		deptQuery := `INSERT INTO drive_eligible_departments (drive_id, department_code) VALUES ($1, $2)`
		for _, dept := range drive.EligibleDepartments {
			_, err := tx.Exec(ctx, deptQuery, id, dept)
			if err != nil {
				return fmt.Errorf("failed to insert eligible department %s: %v", dept, err)
			}
		}
	}

	// Update Job Roles
	// Strategy: Intelligent sync to preserve Role IDs
	// 1. Get existing roles
	var existingRoles []struct {
		ID   int64
		Name string
	}
	rows, _ := tx.Query(ctx, "SELECT id, role_name FROM job_roles WHERE drive_id=$1", id)
	for rows.Next() {
		var er struct {
			ID   int64
			Name string
		}
		rows.Scan(&er.ID, &er.Name)
		existingRoles = append(existingRoles, er)
	}
	rows.Close()

	newRoleNames := make(map[string]bool)
	for _, role := range drive.Roles {
		newRoleNames[role.RoleName] = true
		// Check if role exists by name
		exists := false
		for _, er := range existingRoles {
			if er.Name == role.RoleName {
				exists = true
				// Update existing
				_, err = tx.Exec(ctx, "UPDATE job_roles SET ctc=$1, salary=$2, stipend=$3 WHERE id=$4",
					role.Ctc, role.Salary, role.Stipend, er.ID)
				if err != nil {
					return fmt.Errorf("failed to update role %s: %v", role.RoleName, err)
				}
				break
			}
		}

		if !exists {
			// Insert new
			roleQuery := `INSERT INTO job_roles (drive_id, role_name, ctc, salary, stipend) VALUES ($1, $2, $3, $4, $5)`
			_, err = tx.Exec(ctx, roleQuery, id, role.RoleName, role.Ctc, role.Salary, role.Stipend)
			if err != nil {
				return fmt.Errorf("failed to insert role %s: %v", role.RoleName, err)
			}
		}
	}

	// Delete roles that are no longer present
	for _, er := range existingRoles {
		if !newRoleNames[er.Name] {
			_, err = tx.Exec(ctx, "DELETE FROM job_roles WHERE id=$1", er.ID)
			if err != nil {
				return fmt.Errorf("failed to delete removed role %s: %v", er.Name, err)
			}
		}
	}

	return tx.Commit(ctx)
}

// 3.5 Get Drive By ID (Internal use for deletion/updates)
func (r *DriveRepository) GetDriveByID(ctx context.Context, id int64) (*models.PlacementDrive, error) {
	query := `
        SELECT
            pd.id, pd.posted_by, pd.company_name, pd.job_description,
            pd.drive_type, pd.company_category, pd.spoc_id,
            pd.offer_type, pd.allow_placed_candidates,
            pd.min_cgpa, pd.max_backlogs_allowed,
            COALESCE((SELECT jsonb_agg(deb.batch_year) FROM drive_eligible_batches deb WHERE deb.drive_id = pd.id), '[]'::jsonb), 
            COALESCE((SELECT jsonb_agg(ded.department_code) FROM drive_eligible_departments ded WHERE ded.drive_id = pd.id), '[]'::jsonb),
            COALESCE(pd.rounds, '[]'::jsonb), COALESCE(pd.attachments, '[]'::jsonb),
            pd.drive_date, pd.deadline_date, pd.website, pd.logo_url, pd.location, pd.location_type, pd.status, pd.created_at,
			COALESCE(s.name, '') as spoc_name, COALESCE(s.designation, '') as spoc_designation,
			COALESCE((SELECT jsonb_agg(jr) FROM job_roles jr WHERE jr.drive_id = pd.id), '[]'::jsonb) as roles
        FROM placement_drives pd
		LEFT JOIN spocs s ON pd.spoc_id = s.id
        WHERE pd.id = $1
    `
	var d models.PlacementDrive
	err := r.DB.QueryRow(ctx, query, id).Scan(
		&d.ID, &d.PostedBy, &d.CompanyName, &d.JobDescription,
		&d.DriveType, &d.CompanyCategory, &d.SpocID,
		&d.OfferType, &d.AllowPlacedCandidates,
		&d.MinCgpa, &d.MaxBacklogsAllowed,
		&d.EligibleBatches, &d.EligibleDepartments,
		&d.Rounds, &d.Attachments,
		&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Location, &d.LocationType, &d.Status, &d.CreatedAt,
		&d.SpocName, &d.SpocDesignation, // [NEW]
		&d.Roles, // [NEW]
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
func (r *DriveRepository) GetDrivesCount(ctx context.Context, filters map[string]interface{}) (int, error) {
	query := `SELECT COUNT(*) FROM placement_drives pd WHERE 1=1`
	var args []interface{}
	argCounter := 1

	if val, ok := filters["category"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.company_category = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["min_salary"]; ok {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.salary >= $%d)", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["type"]; ok && val != "" {
		query += fmt.Sprintf(" AND pd.drive_type = $%d", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["department"]; ok && val != "" {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM drive_eligible_departments ded WHERE ded.drive_id = pd.id AND ded.department_code = $%d)", argCounter)
		args = append(args, val)
		argCounter++
	}

	if val, ok := filters["batch"]; ok {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM drive_eligible_batches deb WHERE deb.drive_id = pd.id AND deb.batch_year = $%d)", argCounter)
		args = append(args, val)
		argCounter++
	}

	// Filter by Search Term
	if val, ok := filters["search"]; ok && val != "" {
		searchTerm := fmt.Sprintf("%%%v%%", val)
		query += fmt.Sprintf(" AND (pd.company_name ILIKE $%d OR pd.job_description ILIKE $%d OR EXISTS (SELECT 1 FROM job_roles jr WHERE jr.drive_id = pd.id AND jr.role_name ILIKE $%d))", argCounter, argCounter, argCounter)
		args = append(args, searchTerm)
		argCounter++
	}

	var count int
	err := r.DB.QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}

func (r *DriveRepository) GetDrivesByIDs(ctx context.Context, ids []int64) ([]models.PlacementDrive, error) {
	query := `
        SELECT 
            id, posted_by, company_name, job_description,
            drive_type, company_category, spoc_id,
            offer_type, allow_placed_candidates,
            min_cgpa, max_backlogs_allowed, 
            COALESCE((SELECT jsonb_agg(deb.batch_year) FROM drive_eligible_batches deb WHERE deb.drive_id = placement_drives.id), '[]'::jsonb), 
            COALESCE((SELECT jsonb_agg(ded.department_code) FROM drive_eligible_departments ded WHERE ded.drive_id = placement_drives.id), '[]'::jsonb),
            COALESCE(rounds, '[]'::jsonb), COALESCE(attachments, '[]'::jsonb),
            drive_date, deadline_date, website, logo_url, location, location_type, status, created_at
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
			&d.ID, &d.PostedBy, &d.CompanyName, &d.JobDescription,
			&d.DriveType, &d.CompanyCategory, &d.SpocID,
			&d.OfferType, &d.AllowPlacedCandidates,
			&d.MinCgpa, &d.MaxBacklogsAllowed,
			&d.EligibleBatches, &d.EligibleDepartments,
			&d.Rounds, &d.Attachments,
			&d.DriveDate, &d.DeadlineDate, &d.Website, &d.LogoURL, &d.Location, &d.LocationType, &d.Status, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		drives = append(drives, d)
	}
	return drives, nil
}

// 5. Admin Force Add (Bypasses Deadline & Eligibility Checks)
func (r *DriveRepository) AdminForceRegister(ctx context.Context, driveID, studentID int64, roleIDs []int64) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// A. Upsert Main Application
	query := `
        INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
        VALUES ($1, $2, 'opted_in', NOW())
        ON CONFLICT (drive_id, student_id) 
        DO UPDATE SET status = 'opted_in', updated_at = NOW()
    `
	_, err = tx.Exec(ctx, query, driveID, studentID)
	if err != nil {
		return err
	}

	// B. Force Insert Roles (Syncing with requested selection)
	// 1. Clear existing roles for this student on this drive
	_, err = tx.Exec(ctx, "DELETE FROM drive_application_roles WHERE drive_id = $1 AND student_id = $2", driveID, studentID)
	if err != nil {
		return err
	}

	// 2. Insert new roles if any
	if len(roleIDs) > 0 {
		for _, rid := range roleIDs {
			_, err = tx.Exec(ctx, "INSERT INTO drive_application_roles (drive_id, student_id, role_id) VALUES ($1, $2, $3)", driveID, studentID, rid)
			if err != nil {
				return err
			}
		}
	} else {
		// If no roles specified, default to applying for ALL roles of this drive
		queryAll := `
			INSERT INTO drive_application_roles (drive_id, student_id, role_id)
			SELECT $1, $2, id FROM job_roles WHERE drive_id = $1
		`
		_, err = tx.Exec(ctx, queryAll, driveID, studentID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
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
        SELECT id, company_name, job_description, drive_type, 
               drive_date, deadline_date, status, company_category, logo_url
        FROM placement_drives 
        WHERE status != 'cancelled'
        ORDER BY created_at DESC
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
		if err := rows.Scan(&d.ID, &d.CompanyName, &d.JobDescription,
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
			if d.DriveDate.After(now.Add(5 * 24 * time.Hour)) {
				categories["upcoming"] = append(categories["upcoming"], d)
			} else {
				// It's happening now or very soon
				categories["ongoing"] = append(categories["ongoing"], d)
			}
		}
	}
	return categories, nil
}

func (r *DriveRepository) UpdateApplicationStatus(ctx context.Context, driveID, studentID int64, status, remarks string, actionedBy int64) error {
	query := `
        UPDATE drive_applications 
        SET status = $1, remarks = $2, 
			actioned_by = $3, actioned_at = NOW(),
			updated_at = NOW() 
        WHERE drive_id = $4 AND student_id = $5 
    `
	tag, err := r.DB.Exec(ctx, query, status, remarks, actionedBy, driveID, studentID)
	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 {
		return fmt.Errorf("request not found")
	}

	return nil
}

// BulkUpdateApplicationStatus approves/rejects multiple drive requests at once
func (r *DriveRepository) BulkUpdateApplicationStatus(ctx context.Context, requests []struct {
	DriveID   int64
	StudentID int64
}, status, remarks string, actionedBy int64) (int, error) {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	query := `
		UPDATE drive_applications 
		SET status = $1, remarks = $2, 
			actioned_by = $3, actioned_at = NOW(),
			updated_at = NOW() 
		WHERE drive_id = $4 AND student_id = $5 
	`

	affected := 0
	for _, req := range requests {
		tag, err := tx.Exec(ctx, query, status, remarks, actionedBy, req.DriveID, req.StudentID)
		if err != nil {
			return affected, err
		}
		affected += int(tag.RowsAffected())
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return affected, nil
}

// GetDriveApplicants fetches all students applied to a drive
func (r *DriveRepository) GetDriveApplicants(ctx context.Context, driveID int64) ([]models.DriveApplicant, error) {
	query := `
        SELECT 
            u.id, COALESCE(u.name, ''), COALESCE(sp.register_number, ''), u.email, COALESCE(sp.department, ''), 
            COALESCE(d_ug.cgpa, 0.0), da.status, COALESCE(sd.resume_url, ''), da.applied_at
        FROM drive_applications da
        JOIN users u ON da.student_id = u.id
        JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN student_degrees d_ug ON u.id = d_ug.user_id AND d_ug.degree_level = 'UG'
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

// GetEligibleStudentTokens fetches FCM tokens of students matching drive's batch + department
// Notifications are sent to all students in the target batch/department, regardless of CGPA
func (r *DriveRepository) GetEligibleStudentTokens(ctx context.Context, drive models.PlacementDrive) ([]string, error) {
	query := `
		SELECT u.fcm_token 
		FROM users u
		JOIN student_personal sp ON u.id = sp.user_id
		WHERE u.role = 'student' 
		AND u.is_active = true 
		AND u.fcm_token IS NOT NULL 
		AND u.fcm_token != ''
		AND (sp.placement_willingness IS NULL OR sp.placement_willingness = 'Interested')
		AND ($1::text[] IS NULL OR cardinality($1::text[]) = 0 OR sp.department = ANY($1::text[]))
		AND ($2::int[] IS NULL OR cardinality($2::int[]) = 0 OR sp.batch_year = ANY($2::int[]))
		AND ($3::boolean = TRUE OR NOT EXISTS (SELECT 1 FROM drive_applications da WHERE da.student_id = u.id AND da.status = 'placed'))
	`

	rows, err := r.DB.Query(ctx, query,
		drive.EligibleDepartments,
		drive.EligibleBatches,
		drive.AllowPlacedCandidates,
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

// GetEligibleStudentPhoneNumbers fetches mobile numbers of students matching drive's batch + department
func (r *DriveRepository) GetEligibleStudentPhoneNumbers(ctx context.Context, drive models.PlacementDrive) ([]string, error) {
	query := `
		SELECT sp.mobile_number 
		FROM users u
		JOIN student_personal sp ON u.id = sp.user_id
		WHERE u.role = 'student' 
		AND u.is_active = true 
		AND sp.mobile_number IS NOT NULL 
		AND sp.mobile_number != '' 
		AND sp.mobile_number != 'NA'
		AND (sp.placement_willingness IS NULL OR sp.placement_willingness = 'Interested')
		AND ($1::text[] IS NULL OR cardinality($1::text[]) = 0 OR sp.department = ANY($1::text[]))
		AND ($2::int[] IS NULL OR cardinality($2::int[]) = 0 OR sp.batch_year = ANY($2::int[]))
		AND ($3::boolean = TRUE OR NOT EXISTS (SELECT 1 FROM drive_applications da WHERE da.student_id = u.id AND da.status = 'placed'))
	`

	rows, err := r.DB.Query(ctx, query,
		drive.EligibleDepartments,
		drive.EligibleBatches,
		drive.AllowPlacedCandidates,
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

// GetEligibleStudentsPreview dynamically tests a CreateDriveInput against the student database
func (r *DriveRepository) GetEligibleStudentsPreview(ctx context.Context, input models.PlacementDrive) ([]models.DriveApplicantDetailed, error) {
	// Robust eligibility evaluation using the exact same constraints applied in the GetStudentDriveRequests / CheckEligibility logic but natively in SQL
	query := `
		SELECT 
            u.id, u.email, COALESCE(u.name, ''), COALESCE(sp.register_number, ''), COALESCE(sp.department, ''), COALESCE(dm.type, 'UG'), COALESCE(sp.batch_year, 0), 
            COALESCE(sp.student_type, ''), COALESCE(sp.placement_willingness, ''),
            COALESCE(sp.mobile_number, ''), COALESCE(sp.gender, ''),
            
            -- Schooling
            COALESCE(sch.tenth_mark, 0), COALESCE(sch.twelfth_mark, 0), COALESCE(sch.diploma_mark, 0),
            
            -- Backlogs
            COALESCE(sch.current_backlogs, 0), COALESCE(sch.history_of_backlogs, 0),

            -- UG Degree
            COALESCE(d_ug.cgpa, 0.0), 
            
            -- PG Degree
            COALESCE(d_pg.cgpa, 0.0),
            
            COALESCE(u.profile_photo_url, '')
        FROM users u
        LEFT JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN departments dm ON sp.department = dm.code
        LEFT JOIN student_schooling sch ON u.id = sch.user_id
        LEFT JOIN student_degrees d_ug ON u.id = d_ug.user_id AND d_ug.degree_level = 'UG'
        LEFT JOIN student_degrees d_pg ON u.id = d_pg.user_id AND d_pg.degree_level = 'PG'
        WHERE u.role = 'student' 
        AND u.is_active = true 
        AND (sp.placement_willingness IS NULL OR sp.placement_willingness = 'Interested')
        AND ($1::text[] IS NULL OR cardinality($1::text[]) = 0 OR sp.department = ANY($1::text[]))
        AND ($2::int[] IS NULL OR cardinality($2::int[]) = 0 OR sp.batch_year = ANY($2::int[]))
        AND ($3 = 'All' OR sp.gender = $3)
        AND COALESCE(sch.current_backlogs, 0) <= $4
	`

	rows, err := r.DB.Query(ctx, query,
		input.EligibleDepartments,
		input.EligibleBatches,
		"All", // Replaced gender string filtering logic to 'All' for preview to match backend expectations or modify SQL slightly if we have real gender data. Actually, models.PlacementDrive doesn't have gender? Wait, let me check model.
		input.MaxBacklogsAllowed,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []models.DriveApplicantDetailed
	for rows.Next() {
		var s models.DriveApplicantDetailed
		var deptType string
		err := rows.Scan(
			&s.ID, &s.Email, &s.FullName, &s.RegisterNumber, &s.Department, &deptType, &s.BatchYear,
			&s.StudentType, &s.PlacementWillingness,
			&s.MobileNumber, &s.Gender,
			&s.TenthMark, &s.TwelfthMark, &s.DiplomaMark,
			&s.CurrentBacklogs, &s.HistoryBacklogs,
			&s.UgCgpa, &s.PgCgpa,
			&s.ProfilePhotoURL,
		)
		if err != nil {
			log.Printf("Error scanning preview student: %v", err)
			continue
		}

		if input.TenthPercentage != nil && s.TenthMark < *input.TenthPercentage {
			continue // Fails 10th
		}

		if s.StudentType == "regular" {
			if input.TwelfthPercentage != nil && s.TwelfthMark < *input.TwelfthPercentage {
				continue // Fails 12th
			}
		} else if s.StudentType == "lateral" {
			if input.TwelfthPercentage != nil && s.DiplomaMark < *input.TwelfthPercentage {
				continue // Fails lateral
			}
		}

		// CGPA Handling - Support PG & UG explicit limits
		effectiveMinUG := input.MinCgpa
		effectiveMinPG := input.MinCgpa
		if input.UGMinCGPA != nil && *input.UGMinCGPA > 0 {
			effectiveMinUG = *input.UGMinCGPA
		}
		if input.PGMinCGPA != nil && *input.PGMinCGPA > 0 {
			effectiveMinPG = *input.PGMinCGPA
		}

		// Checking aggregate logic or direct CGPA
		if input.UseAggregate && input.AggregatePercentage != nil && *input.AggregatePercentage > 0 {
			// Approximate CGPA to percentage (cgpa * 10)
			ugPerc := s.UgCgpa * 10
			pgPerc := s.PgCgpa * 10

			if deptType == "PG" {
				if pgPerc < *input.AggregatePercentage {
					continue
				}
			} else {
				if ugPerc < *input.AggregatePercentage {
					continue
				}
			}
		} else {
			if deptType == "PG" {
				if s.PgCgpa < effectiveMinPG {
					continue
				}
			} else {
				if s.UgCgpa < effectiveMinUG {
					continue
				}
			}
		}

		students = append(students, s)
	}

	return students, nil
}

// GetAdminFCMTokens fetches FCM tokens of all active admin users
func (r *DriveRepository) GetAdminFCMTokens(ctx context.Context) ([]string, error) {
	query := `
		SELECT fcm_token FROM users
		WHERE role = 'admin' AND is_active = true
		AND fcm_token IS NOT NULL AND fcm_token != ''
	`
	rows, err := r.DB.Query(ctx, query)
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

// GetDriveApplicantsDetailed fetches detailed profile of students who applied to a drive
// Optionally filters by a list of student IDs (if empty, fetches all)
// Optionally filters by department (for Coordinators)
func (r *DriveRepository) GetDriveApplicantsDetailed(ctx context.Context, driveID int64, studentIDs []int64, departmentFilter *string) ([]models.DriveApplicantDetailed, error) {
	// Base Query matches GetStudentFullProfile but joins drive_applications
	query := `
        SELECT 
            u.id, u.email, u.is_blocked, u.last_login,
            COALESCE(u.name, ''), COALESCE(sp.register_number, ''), COALESCE(sp.department, ''), COALESCE(dm.type, 'UG'), COALESCE(sp.batch_year, 0), 
            COALESCE(sp.student_type, ''), COALESCE(sp.placement_willingness, ''),
            COALESCE(sp.mobile_number, ''), COALESCE(sp.gender, ''), COALESCE(sp.dob::text, ''),
            COALESCE(sp.address_line_1, ''), COALESCE(sp.address_line_2, ''), COALESCE(sp.state, ''),
            COALESCE(sp.pan_number, ''), COALESCE(sp.aadhar_number, ''),
            COALESCE(sp.social_links, '{}'::jsonb), COALESCE(sp.language_skills, '{}'::jsonb),

            -- Schooling
            COALESCE(sch.tenth_mark, 0), COALESCE(sch.tenth_board, ''), COALESCE(sch.tenth_year_pass, 0), COALESCE(sch.tenth_institution, ''),
            COALESCE(sch.twelfth_mark, 0), COALESCE(sch.twelfth_board, ''), COALESCE(sch.twelfth_year_pass, 0), COALESCE(sch.twelfth_institution, ''),
            COALESCE(sch.diploma_mark, 0), COALESCE(sch.diploma_year_pass, 0), COALESCE(sch.diploma_institution, ''),
            
            -- Backlogs
            COALESCE(sch.current_backlogs, 0), COALESCE(sch.history_of_backlogs, 0),
            COALESCE(sch.gap_years, 0), COALESCE(sch.gap_reason, ''),

            -- UG Degree (Score Only)
            COALESCE(d_ug.year_pass, 0), COALESCE(d_ug.cgpa, 0.0), COALESCE(d_ug.semester_gpas, '{}'::jsonb),

            -- PG Degree (Score Only)
            COALESCE(d_pg.year_pass, 0), COALESCE(d_pg.cgpa, 0.0), COALESCE(d_pg.semester_gpas, '{}'::jsonb),

            COALESCE(sd.resume_url, ''), COALESCE(u.profile_photo_url, ''),
            sd.resume_updated_at,

			-- Drive Application Specifics
			da.status, da.applied_at::text, 
            COALESCE((SELECT jsonb_agg(dar.role_id) FROM drive_application_roles dar WHERE dar.drive_id = da.drive_id AND dar.student_id = da.student_id), '[]'::jsonb), 
            COALESCE(da.opt_out_reason, '')

        FROM drive_applications da
        JOIN users u ON da.student_id = u.id
        LEFT JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN departments dm ON sp.department = dm.code
        LEFT JOIN student_schooling sch ON u.id = sch.user_id
        
        LEFT JOIN student_degrees d_ug ON u.id = d_ug.user_id AND d_ug.degree_level = 'UG'
        LEFT JOIN student_degrees d_pg ON u.id = d_pg.user_id AND d_pg.degree_level = 'PG'
        
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE da.drive_id = $1
    `

	args := []interface{}{driveID}
	nextArg := 2

	if len(studentIDs) > 0 {
		query += fmt.Sprintf(" AND u.id = ANY($%d)", nextArg)
		args = append(args, studentIDs)
		nextArg++
	}

	if departmentFilter != nil {
		query += fmt.Sprintf(" AND sp.department = $%d", nextArg)
		args = append(args, *departmentFilter)
		nextArg++
	}

	query += " ORDER BY da.applied_at DESC"

	rows, err := r.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var applicants []models.DriveApplicantDetailed

	for rows.Next() {
		var s models.DriveApplicantDetailed
		var socialLinksBytes, languageSkillsBytes []byte
		var ugSemesterGpasBytes, pgSemesterGpasBytes []byte
		var appliedRoleIDsBytes []byte

		err := rows.Scan(
			&s.ID, &s.Email, &s.IsBlocked, &s.LastLogin,
			&s.FullName, &s.RegisterNumber, &s.Department, &s.DepartmentType, &s.BatchYear,
			&s.StudentType, &s.PlacementWillingness,
			&s.MobileNumber, &s.Gender, &s.Dob,
			&s.AddressLine1, &s.AddressLine2, &s.State,
			&s.PanNumber, &s.AadharNumber,
			&socialLinksBytes, &languageSkillsBytes,

			&s.TenthMark, &s.TenthBoard, &s.TenthYearPass, &s.TenthInstitution,
			&s.TwelfthMark, &s.TwelfthBoard, &s.TwelfthYearPass, &s.TwelfthInstitution,
			&s.DiplomaMark, &s.DiplomaYearPass, &s.DiplomaInstitution,

			&s.CurrentBacklogs, &s.HistoryBacklogs,
			&s.GapYears, &s.GapReason,

			&s.UgYearPass, &s.UgCgpa, &ugSemesterGpasBytes,
			&s.PgYearPass, &s.PgCgpa, &pgSemesterGpasBytes,

			&s.ResumeURL, &s.ProfilePhotoURL,
			&s.ResumeUpdatedAt,

			// Drive Specifics
			&s.Status, &s.AppliedAt, &appliedRoleIDsBytes, &s.OptOutReason,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal JSONB fields
		if len(socialLinksBytes) > 0 {
			_ = json.Unmarshal(socialLinksBytes, &s.SocialLinks)
		}
		if len(languageSkillsBytes) > 0 {
			_ = json.Unmarshal(languageSkillsBytes, &s.LanguageSkills)
		}
		if len(appliedRoleIDsBytes) > 0 {
			_ = json.Unmarshal(appliedRoleIDsBytes, &s.AppliedRoleIDs)
		}

		// Map Semester GPAs
		var ugGpas, pgGpas map[string]float64
		if len(ugSemesterGpasBytes) > 0 {
			json.Unmarshal(ugSemesterGpasBytes, &ugGpas)
		}
		if len(pgSemesterGpasBytes) > 0 {
			json.Unmarshal(pgSemesterGpasBytes, &pgGpas)
		}

		// Map Helper for GPAs
		s.UgGpaS1 = ugGpas["1"]
		s.UgGpaS2 = ugGpas["2"]
		s.UgGpaS3 = ugGpas["3"]
		s.UgGpaS4 = ugGpas["4"]
		s.UgGpaS5 = ugGpas["5"]
		s.UgGpaS6 = ugGpas["6"]
		s.UgGpaS7 = ugGpas["7"]
		s.UgGpaS8 = ugGpas["8"]
		s.UgGpaS9 = ugGpas["9"]
		s.UgGpaS10 = ugGpas["10"]

		s.PgGpaS1 = pgGpas["1"]
		s.PgGpaS2 = pgGpas["2"]
		s.PgGpaS3 = pgGpas["3"]
		s.PgGpaS4 = pgGpas["4"]
		s.PgGpaS5 = pgGpas["5"]
		s.PgGpaS6 = pgGpas["6"]
		s.PgGpaS7 = pgGpas["7"]
		s.PgGpaS8 = pgGpas["8"]

		applicants = append(applicants, s)
	}

	return applicants, nil
}

// GetStudentFCMToken fetches the FCM token for a specific student
func (r *DriveRepository) GetStudentFCMToken(ctx context.Context, studentID int64) (string, error) {
	var token string
	query := `SELECT COALESCE(fcm_token, '') FROM users WHERE id = $1`
	err := r.DB.QueryRow(ctx, query, studentID).Scan(&token)
	if err != nil {
		return "", err
	}
	return token, nil
}

// GetDriveRequests fetches all applications with status 'request_to_attend'
func (r *DriveRepository) GetDriveRequests(ctx context.Context) ([]models.DriveApplicant, error) {
	query := `
        SELECT 
            pd.id, pd.company_name,
            u.id, COALESCE(u.name, ''), COALESCE(sp.register_number, ''), u.email, COALESCE(sp.department, ''), 
            CASE WHEN COALESCE(d_pg.cgpa, 0) > 0 THEN d_pg.cgpa ELSE COALESCE(d_ug.cgpa, 0) END,
            da.status, COALESCE(sd.resume_url, ''), 
            COALESCE(u.profile_photo_url, ''),
            da.applied_at,
            COALESCE(da.remarks, ''),
            COALESCE(d.type, 'UG'),
            COALESCE((SELECT jsonb_agg(dar.role_id) FROM drive_application_roles dar WHERE dar.drive_id = da.drive_id AND dar.student_id = da.student_id), '[]'::jsonb),
            COALESCE(
                (SELECT string_agg(jr.role_name, ', ') 
                 FROM drive_application_roles dar
                 JOIN job_roles jr ON dar.role_id = jr.id 
                 WHERE dar.drive_id = pd.id AND dar.student_id = da.student_id
                ), ''
            ) as applied_role_names
        FROM drive_applications da
        JOIN placement_drives pd ON da.drive_id = pd.id
        JOIN users u ON da.student_id = u.id
        JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN departments d ON sp.department = d.code
        LEFT JOIN student_degrees d_ug ON u.id = d_ug.user_id AND d_ug.degree_level = 'UG'
        LEFT JOIN student_degrees d_pg ON u.id = d_pg.user_id AND d_pg.degree_level = 'PG'
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE da.status = 'request_to_attend'
        ORDER BY da.applied_at DESC
    `

	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := []models.DriveApplicant{}
	for rows.Next() {
		var a models.DriveApplicant
		var appliedAt time.Time
		var appliedRoleNames string
		err := rows.Scan(
			&a.DriveID, &a.CompanyName,
			&a.StudentID, &a.FullName, &a.RegisterNumber, &a.Email, &a.Department,
			&a.Cgpa, &a.Status, &a.ResumeURL,
			&a.ProfilePhotoURL,
			&appliedAt,
			&a.Remarks,
			&a.DepartmentType,
			&a.AppliedRoleIDs,
			&appliedRoleNames,
		)
		if err != nil {
			return nil, err
		}
		a.AppliedAt = appliedAt.Format("2006-01-02 15:04")
		a.AppliedRoleNames = appliedRoleNames
		requests = append(requests, a)
	}
	return requests, nil
}
