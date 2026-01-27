package repository

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// BulkCreateStudents inserts multiple students in a transaction
func (r *UserRepository) BulkCreateStudents(ctx context.Context, students [][]string) (int, error) {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	count := 0

	// 1. Insert User
	stmtUser := `INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, 'student', true) RETURNING id`

	// 2. Insert Profile
	// 2. Insert Profile
	// Note: Providing defaults for mandatory fields like full_name is handled by DB constraints or assumed valid from CSV
	stmtProfile := `INSERT INTO student_personal (user_id, full_name, register_number, department, batch_year, mobile_number) VALUES ($1, $2, $3, $4, $5, 'NA')`

	// 3. Initialize Academics (Optional, but good practice to have a row)
	stmtAcademics := `INSERT INTO student_academics (user_id) VALUES ($1)`

	// 4. Initialize Documents (Optional)
	stmtDocs := `INSERT INTO student_documents (user_id) VALUES ($1)`

	for _, row := range students {
		// Updated CSV Row: [0]Email, [1]Name, [2]RegNo, [3]Dept, [4]BatchYear, [5]Password

		// Skip empty lines or malformed lines immediately
		if len(row) == 0 {
			continue
		}

		// Safety check - Enforce exactly 6 columns
		if len(row) != 6 {
			return count, fmt.Errorf("invalid row format: expected 6 columns (email,name,regNo,dept,batch_year,password), got %d", len(row))
		}

		email := row[0]
		name := row[1]
		regNo := row[2]
		dept := row[3]
		batchYear, err := strconv.Atoi(row[4])
		if err != nil {
			return count, fmt.Errorf("invalid batch year for %s: %v", email, err)
		}
		rawPass := row[5]

		hashedPass, _ := bcrypt.GenerateFromPassword([]byte(rawPass), bcrypt.DefaultCost)

		var userID int64
		err = tx.QueryRow(ctx, stmtUser, email, string(hashedPass)).Scan(&userID)
		if err != nil {
			return count, fmt.Errorf("failed to insert user %s: %w", email, err)
		}

		if _, err = tx.Exec(ctx, stmtProfile, userID, name, regNo, dept, batchYear); err != nil {
			return count, fmt.Errorf("failed to insert profile for %s: %w", email, err)
		}

		if _, err = tx.Exec(ctx, stmtAcademics, userID); err != nil {
			return count, fmt.Errorf("failed to init academics for %s: %w", email, err)
		}

		if _, err = tx.Exec(ctx, stmtDocs, userID); err != nil {
			return count, fmt.Errorf("failed to init docs for %s: %w", email, err)
		}

		count++
	}

	return count, tx.Commit(ctx)
}

func (r *UserRepository) UpdateDocumentPath(ctx context.Context, userID int64, docType, path string) error {
	var query string

	// Map document type to database column
	switch docType {
	case "resume":
		query = `INSERT INTO student_documents (user_id, resume_url) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET resume_url = $2`
	case "aadhar":
		query = `INSERT INTO student_documents (user_id, aadhar_card_url) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET aadhar_card_url = $2`
	case "pan":
		query = `INSERT INTO student_documents (user_id, pan_card_url) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET pan_card_url = $2`
	case "profile_pic":
		query = `INSERT INTO student_documents (user_id, profile_photo_url) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET profile_photo_url = $2`
	default:
		return fmt.Errorf("invalid document type")
	}

	_, err := r.DB.Exec(ctx, query, userID, path)
	return err
}

// GetRegisterNumber fetches the official ID for a user (e.g., "24MCR029")
func (r *UserRepository) GetRegisterNumber(ctx context.Context, userID int64) (string, error) {
	var regNo string
	query := `SELECT register_number FROM student_personal WHERE user_id = $1`

	err := r.DB.QueryRow(ctx, query, userID).Scan(&regNo)
	if err != nil {
		return "", fmt.Errorf("student profile not found (register number missing)")
	}
	return regNo, nil
}

// IsStudentProfileComplete checks if a student has completed their profile setup
// Returns true if mobile_number is set and not 'NA'
func (r *UserRepository) IsStudentProfileComplete(ctx context.Context, userID int64) bool {
	var mobileNumber string
	query := `SELECT COALESCE(mobile_number, '') FROM student_personal WHERE user_id = $1`

	err := r.DB.QueryRow(ctx, query, userID).Scan(&mobileNumber)
	if err != nil {
		return false
	}

	// Profile is considered complete if mobile is not empty or 'NA'
	return mobileNumber != "" && mobileNumber != "NA"
}

// GetRegisterNumbersByIDs fetches register numbers for multiple user IDs
func (r *UserRepository) GetRegisterNumbersByIDs(ctx context.Context, ids []int64) ([]string, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	query := `SELECT register_number FROM student_personal WHERE user_id = ANY($1)`
	rows, err := r.DB.Query(ctx, query, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var regNos []string
	for rows.Next() {
		var regNo string
		if err := rows.Scan(&regNo); err != nil {
			continue // Skip errors? or return?
		}
		regNos = append(regNos, regNo)
	}
	return regNos, nil
}

// GetStudentByRegisterNumber fetches full profile by RegNo
func (r *UserRepository) GetStudentByRegisterNumber(ctx context.Context, regNo string) (*models.StudentFullProfile, error) {
	query := `
        SELECT 
            u.id, u.email, u.is_blocked, u.last_login,
            sp.full_name, sp.register_number, sp.department, sp.batch_year, 
            coalesce(sp.student_type, ''), coalesce(sp.placement_willingness, ''), coalesce(sp.gender, ''), coalesce(sp.dob, ''), sp.mobile_number,
            coalesce(sp.city, ''), coalesce(sp.state, ''), coalesce(sp.social_links, '{}'::jsonb), coalesce(sp.language_skills, '[]'::jsonb), coalesce(sp.about_me, ''),
            coalesce(sa.tenth_mark,0), coalesce(sa.twelfth_mark,0), coalesce(sa.diploma_mark,0),
            coalesce(sa.ug_cgpa,0), coalesce(sa.pg_cgpa,0), coalesce(sa.current_backlogs,0), coalesce(sa.history_of_backlogs,0),
            coalesce(sa.gap_years,0), coalesce(sa.gap_reason, ''),
            coalesce(sd.resume_url, ''), coalesce(sd.profile_photo_url, ''), coalesce(sd.aadhar_card_url, ''), coalesce(sd.pan_card_url, '')
        FROM users u
        JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN student_academics sa ON u.id = sa.user_id
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE sp.register_number = $1
    `
	var s models.StudentFullProfile
	// Note: We need to handle nullable fields carefully or use COALESCE in query as done above
	err := r.DB.QueryRow(ctx, query, regNo).Scan(
		&s.ID, &s.Email, &s.IsBlocked, &s.LastLogin,
		&s.FullName, &s.RegisterNumber, &s.Department, &s.BatchYear,
		&s.StudentType, &s.PlacementWillingness, &s.Gender, &s.Dob, &s.MobileNumber,
		&s.City, &s.State, &s.SocialLinks, &s.LanguageSkills, &s.AboutMe,
		&s.TenthMark, &s.TwelfthMark, &s.DiplomaMark,
		&s.UgCgpa, &s.PgCgpa, &s.CurrentBacklogs, &s.HistoryBacklogs,
		&s.GapYears, &s.GapReason,
		&s.ResumeURL, &s.ProfilePhotoURL, &s.AadharCardURL, &s.PanCardURL,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// DeleteStudentById hard deletes a single student
func (r *UserRepository) DeleteStudentById(ctx context.Context, userID int64) error {
	// This triggers CASCADE on student_personal, student_academics, drive_applications, etc.
	query := `DELETE FROM users WHERE id = $1 AND role = 'student'`

	result, err := r.DB.Exec(ctx, query, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("student not found")
	}
	return nil
}

// BulkDeleteStudents deletes students matching specific criteria
func (r *UserRepository) BulkDeleteStudents(ctx context.Context, department string, batchYear int) (int64, error) {
	// "Guru" Query: Delete users whose ID matches the filter in the profile table
	query := `
        DELETE FROM users 
        WHERE id IN (
            SELECT user_id FROM student_personal 
            WHERE 1=1
    `
	var args []interface{}
	argCounter := 1

	if department != "" {
		query += fmt.Sprintf(" AND department = $%d", argCounter)
		args = append(args, department)
		argCounter++
	}

	if batchYear > 0 {
		query += fmt.Sprintf(" AND batch_year = $%d", argCounter)
		args = append(args, batchYear)
		argCounter++
	}

	query += `)` // Close the subquery

	// Safety: If no filters are provided, DO NOT run delete (prevents wiping whole DB)
	if len(args) == 0 {
		return 0, fmt.Errorf("at least one filter (department or batch) is required")
	}

	result, err := r.DB.Exec(ctx, query, args...)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected(), nil
}

// BulkDeleteStudentsByIds deletes students by a list of IDs
func (r *UserRepository) BulkDeleteStudentsByIds(ctx context.Context, ids []int64) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}

	// Delete from users table (cascades to profile, academics, etc.)
	query := `DELETE FROM users WHERE id = ANY($1) AND role = 'student'`

	result, err := r.DB.Exec(ctx, query, ids)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// UpdateLastLogin sets the last_login timestamp to NOW()
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID int64) error {
	query := `UPDATE users SET last_login = NOW() WHERE id = $1`
	_, err := r.DB.Exec(ctx, query, userID)
	return err
}

func (r *UserRepository) SetUserBlockStatus(ctx context.Context, userID int64, isBlocked bool) error {
	query := `UPDATE users SET is_blocked = $1 WHERE id = $2`
	_, err := r.DB.Exec(ctx, query, isBlocked, userID)
	return err
}

// UpdateFCMToken updates the Firebase Cloud Messaging token for a user
func (r *UserRepository) UpdateFCMToken(ctx context.Context, userID int64, token string) error {
	query := `UPDATE users SET fcm_token = $1 WHERE id = $2`
	_, err := r.DB.Exec(ctx, query, token, userID)
	return err
}

// GetStudents fetches students with dynamic filters and pagination
func (r *UserRepository) GetStudents(ctx context.Context, department string, batchYear int, search string, limit, offset int) ([]map[string]interface{}, int64, error) {
	// Base Query conditions
	whereClause := "WHERE u.role = 'student'"
	var args []interface{}
	argCounter := 1

	// Dynamic Filters
	if department != "" && department != "All" {
		whereClause += fmt.Sprintf(" AND sp.department = $%d", argCounter)
		args = append(args, department)
		argCounter++
	}
	if batchYear > 0 {
		whereClause += fmt.Sprintf(" AND sp.batch_year = $%d", argCounter)
		args = append(args, batchYear)
		argCounter++
	}
	if search != "" {
		whereClause += fmt.Sprintf(" AND (sp.full_name ILIKE $%d OR sp.register_number ILIKE $%d)", argCounter, argCounter)
		args = append(args, "%"+search+"%", "%"+search+"%")
		argCounter++
	}

	// 1. Get Total Count (for pagination)
	countQuery := fmt.Sprintf(`
        SELECT COUNT(*)
        FROM users u
        JOIN student_personal sp ON u.id = sp.user_id
        %s
    `, whereClause)

	var totalCount int64
	err := r.DB.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	// 2. Fetch Data with Pagination
	query := fmt.Sprintf(`
        SELECT u.id, u.email, COALESCE(u.is_blocked, false), sp.full_name, COALESCE(sp.register_number, ''), COALESCE(sp.department, ''), COALESCE(sp.batch_year, 0), sp.mobile_number, u.last_login, sd.profile_photo_url
        FROM users u
        JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        %s
        ORDER BY sp.register_number ASC
        LIMIT $%d OFFSET $%d
    `, whereClause, argCounter, argCounter+1)

	// Append limit and offset to args
	args = append(args, limit, offset)

	rows, err := r.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var students []map[string]interface{}
	for rows.Next() {
		var id int64
		var email, name, regNo, dept string
		var mobile, profilePhoto *string // Handle nullable
		var batch int
		var isBlocked bool
		var lastLogin *time.Time

		rows.Scan(&id, &email, &isBlocked, &name, &regNo, &dept, &batch, &mobile, &lastLogin, &profilePhoto)

		mobileStr := ""
		if mobile != nil {
			mobileStr = *mobile
		}

		profilePhotoStr := ""
		if profilePhoto != nil {
			profilePhotoStr = *profilePhoto
		}

		students = append(students, map[string]interface{}{
			"id":                id,
			"email":             email,
			"full_name":         name,
			"register_number":   regNo,
			"department":        dept,
			"batch_year":        batch,
			"mobile":            mobileStr,
			"profile_photo_url": profilePhotoStr,
			"is_blocked":        isBlocked,
			"last_login":        lastLogin,
		})
	}
	return students, totalCount, nil
}
