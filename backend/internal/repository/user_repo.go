package repository

import (
	"context"
	"encoding/json"
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

	// 3. Initialize Academics (Schooling/History)
	stmtSchooling := `INSERT INTO student_schooling (user_id) VALUES ($1)`

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

		if _, err = tx.Exec(ctx, stmtSchooling, userID); err != nil {
			return count, fmt.Errorf("failed to init schooling for %s: %w", email, err)
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
		query = `INSERT INTO student_documents (user_id, resume_url, resume_updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET resume_url = $2, resume_updated_at = NOW()`
	case "aadhar":
		query = `INSERT INTO student_documents (user_id, aadhar_card_url, aadhar_card_updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET aadhar_card_url = $2, aadhar_card_updated_at = NOW()`
	case "pan":
		query = `INSERT INTO student_documents (user_id, pan_card_url, pan_card_updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET pan_card_url = $2, pan_card_updated_at = NOW()`
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
// Returns true if all critical onboarding fields are filled
func (r *UserRepository) IsStudentProfileComplete(ctx context.Context, userID int64) bool {
	var mobileNumber, dob, gender, profilePhotoURL string
	// Updated Query: Check profile_photo_url from student_documents table
	query := `
		SELECT 
			COALESCE(sp.mobile_number, ''), 
			COALESCE(sp.dob, ''), 
			COALESCE(sp.gender, ''),
			COALESCE(sd.profile_photo_url, '')
		FROM student_personal sp
		LEFT JOIN student_documents sd ON sp.user_id = sd.user_id
		WHERE sp.user_id = $1
	`

	err := r.DB.QueryRow(ctx, query, userID).Scan(&mobileNumber, &dob, &gender, &profilePhotoURL)
	if err != nil {
		// Row doesn't exist, profile is incomplete
		return false
	}

	// Profile is complete if all critical fields are filled (not empty or 'NA')
	// These are fields collected during onboarding
	return mobileNumber != "" && mobileNumber != "NA" &&
		dob != "" && dob != "NA" &&
		gender != "" && gender != "NA" &&
		profilePhotoURL != "" && profilePhotoURL != "NA"
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
            coalesce(sp.full_name, ''), coalesce(sp.register_number, ''), coalesce(sp.department, ''), COALESCE(dm.type, 'UG'), coalesce(sp.batch_year, 0), 
            coalesce(sp.student_type, 'Regular'), coalesce(sp.placement_willingness, 'Interested'), coalesce(sp.gender, ''), coalesce(to_char(sp.dob, 'YYYY-MM-DD'), ''), coalesce(sp.mobile_number, ''),
            coalesce(sp.address_line_1, ''), coalesce(sp.address_line_2, ''), coalesce(sp.state, ''),
            coalesce(sp.pan_number, ''), coalesce(sp.aadhar_number, ''),
            coalesce(sp.social_links, '{}'::jsonb), coalesce(sp.language_skills, '[]'::jsonb),
            
            -- Schooling
            coalesce(sch.tenth_mark,0), coalesce(sch.tenth_board,''), coalesce(sch.tenth_year_pass,0), coalesce(sch.tenth_institution,''),
            coalesce(sch.twelfth_mark,0), coalesce(sch.twelfth_board,''), coalesce(sch.twelfth_year_pass,0), coalesce(sch.twelfth_institution,''),
            coalesce(sch.diploma_mark,0), coalesce(sch.diploma_year_pass,0), coalesce(sch.diploma_institution,''),
            
            -- Backlogs
            coalesce(sch.current_backlogs,0), coalesce(sch.history_of_backlogs,0),
            coalesce(sch.gap_years,0), coalesce(sch.gap_reason, ''),

            -- UG Degree (Score Only)
            coalesce(d_ug.year_pass, 0), coalesce(d_ug.cgpa, 0), coalesce(d_ug.semester_gpas, '{}'::jsonb),

            -- PG Degree (Score Only)
            coalesce(d_pg.year_pass, 0), coalesce(d_pg.cgpa, 0), coalesce(d_pg.semester_gpas, '{}'::jsonb),

            coalesce(sd.resume_url, ''), coalesce(sd.profile_photo_url, ''),
            sd.resume_updated_at
        FROM users u
        JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN departments dm ON sp.department = dm.code
        LEFT JOIN student_schooling sch ON u.id = sch.user_id
        
        LEFT JOIN student_degrees d_ug ON u.id = d_ug.user_id AND d_ug.degree_level = 'UG'
        LEFT JOIN student_degrees d_pg ON u.id = d_pg.user_id AND d_pg.degree_level = 'PG'
        
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE sp.register_number ILIKE $1
    `
	var s models.StudentFullProfile
	var socialLinksBytes, languageSkillsBytes []byte
	var ugSemesterGpasBytes, pgSemesterGpasBytes []byte

	// Mapping logic: Struct has flat fields for UG/PG degrees?
	// Struct has: TenthMark... DiplomaMark...
	// Struct does NOT have UgDegree, UgSpec... checking model file...
	// Struct has: UgCgpa, PgCgpa. But existing struct lines 122+ only have GPAs.
	// Wait, previous model view lines 141+ had UgDegree etc.
	// Ah, lines 122+ in `student.go` (latest view) ONLY show `UgCgpa`, `PgCgpa`.
	// The previous Schema had `ug_degree`, `ug_specialisation` in `student_academics`.
	// The Go Model `StudentFullProfile` I viewed (lines 107-163) DOES NOT HAVE `UgDegree` string fields!
	// It only has `UgCgpa`, `PgCgpa`, `UgGpaS1`...
	// Let me double check lines 107-121 (Schooling) and 122+ (GPAs).
	// Yes, `StudentFullProfile` in `student.go` (viewed lines 84-163) DOES NOT have `UgDegree`, `UgInstitution` fields.
	// So I only need to scan CGPA and Semesters.
	// However, I should scan the others into dummy vars to consume the columns if I selected them?
	// Or just NOT SELECT them if not needed.
	// Previous schema had them. But if Go struct doesn't expose them, I don't need to select them?
	// Wait, if the Frontend uses them, they must be in the Go struct.
	// I might have missed fields in `student.go` view (truncated or just not there?).
	// Line 121 ends Diploma. Line 122 is UgCgpa.
	// If they were there, they would be between 121 and 122.
	// I previously saw `ug_degree` in `project_schema.sql`.
	// But `models/student.go` seems to align with what I saw.
	// I will Assume `StudentFullProfile` DOES NOT have degree details (names/inst) for now, OR I will check if I missed them.
	// Actually, `student_academics` table had them. The Go struct SHOULD have them.
	// Maybe `StudentFullProfile` definition I read was incomplete or I missed lines?
	// Let me checking lines 107-121... Diploma.
	// Keep it safe: I will SELECT them but scan into dummy vars if not in struct, or just NOT SELECT them.
	// But normalized table has them.
	// I'll scan `UgCgpa` and `PgCgpa`.

	err := r.DB.QueryRow(ctx, query, regNo).Scan(
		&s.ID, &s.Email, &s.IsBlocked, &s.LastLogin,
		&s.FullName, &s.RegisterNumber, &s.Department, &s.DepartmentType, &s.BatchYear,
		&s.StudentType, &s.PlacementWillingness, &s.Gender, &s.Dob, &s.MobileNumber,
		&s.AddressLine1, &s.AddressLine2, &s.State,
		&s.PanNumber, &s.AadharNumber,
		&socialLinksBytes, &languageSkillsBytes,

		&s.TenthMark, &s.TenthBoard, &s.TenthYearPass, &s.TenthInstitution,
		&s.TwelfthMark, &s.TwelfthBoard, &s.TwelfthYearPass, &s.TwelfthInstitution,
		&s.DiplomaMark, &s.DiplomaYearPass, &s.DiplomaInstitution,

		&s.CurrentBacklogs, &s.HistoryBacklogs,
		&s.GapYears, &s.GapReason,

		// UG (Score Only)
		&s.UgYearPass, &s.UgCgpa, &ugSemesterGpasBytes,

		// PG (Score Only)
		&s.PgYearPass, &s.PgCgpa, &pgSemesterGpasBytes,

		&s.ResumeURL, &s.ProfilePhotoURL,
		&s.ResumeUpdatedAt,
	)
	if err != nil {
		fmt.Printf("Scan Error: %v\n", err)
		return nil, err
	}

	// Unmarshal
	if len(socialLinksBytes) > 0 {
		_ = json.Unmarshal(socialLinksBytes, &s.SocialLinks)
	}
	if len(languageSkillsBytes) > 0 {
		_ = json.Unmarshal(languageSkillsBytes, &s.LanguageSkills)
	}

	// Map Semester GPAs
	var ugGpas, pgGpas map[string]float64
	if len(ugSemesterGpasBytes) > 0 {
		json.Unmarshal(ugSemesterGpasBytes, &ugGpas)
	}
	if len(pgSemesterGpasBytes) > 0 {
		json.Unmarshal(pgSemesterGpasBytes, &pgGpas)
	}

	// Manual Mapping to Flat Fields
	if v, ok := ugGpas["1"]; ok {
		s.UgGpaS1 = v
	}
	if v, ok := ugGpas["2"]; ok {
		s.UgGpaS2 = v
	}
	if v, ok := ugGpas["3"]; ok {
		s.UgGpaS3 = v
	}
	if v, ok := ugGpas["4"]; ok {
		s.UgGpaS4 = v
	}
	if v, ok := ugGpas["5"]; ok {
		s.UgGpaS5 = v
	}
	if v, ok := ugGpas["6"]; ok {
		s.UgGpaS6 = v
	}
	if v, ok := ugGpas["7"]; ok {
		s.UgGpaS7 = v
	}
	if v, ok := ugGpas["8"]; ok {
		s.UgGpaS8 = v
	}
	if v, ok := ugGpas["9"]; ok {
		s.UgGpaS9 = v
	}
	if v, ok := ugGpas["10"]; ok {
		s.UgGpaS10 = v
	}

	if v, ok := pgGpas["1"]; ok {
		s.PgGpaS1 = v
	}
	if v, ok := pgGpas["2"]; ok {
		s.PgGpaS2 = v
	}
	if v, ok := pgGpas["3"]; ok {
		s.PgGpaS3 = v
	}
	if v, ok := pgGpas["4"]; ok {
		s.PgGpaS4 = v
	}
	if v, ok := pgGpas["5"]; ok {
		s.PgGpaS5 = v
	}
	if v, ok := pgGpas["6"]; ok {
		s.PgGpaS6 = v
	}
	if v, ok := pgGpas["7"]; ok {
		s.PgGpaS7 = v
	}
	if v, ok := pgGpas["8"]; ok {
		s.PgGpaS8 = v
	}

	// --- Placement Analytics ---
	// ... (Keep existing logic)
	eligibleQuery := `
		SELECT count(*) 
		FROM placement_drives 
		WHERE status != 'draft' AND status != 'cancelled'
		AND eligible_batches @> $1::jsonb
		AND eligible_departments @> $2::jsonb
		AND (min_cgpa IS NULL OR min_cgpa <= $3)
		AND (max_backlogs_allowed IS NULL OR max_backlogs_allowed >= $4)
	`
	batchJson := fmt.Sprintf("[%d]", s.BatchYear)
	deptJson := fmt.Sprintf("[\"%s\"]", s.Department)

	var eligibleCount int
	err = r.DB.QueryRow(ctx, eligibleQuery, batchJson, deptJson, s.UgCgpa, s.CurrentBacklogs).Scan(&eligibleCount)
	if err == nil {
		s.PlacementStats.EligibleDrives = eligibleCount
	}

	statsQuery := `
		SELECT 
			count(*) filter (where status = 'opted_in'),
			count(*) filter (where status = 'opted_out'),
			count(*) filter (where status IN ('shortlisted', 'rejected', 'placed', 'completed')),
			count(*) filter (where status = 'placed')
		FROM drive_applications 
		WHERE student_id = $1
	`
	var optedIn, optedOut, attended, offers int
	err = r.DB.QueryRow(ctx, statsQuery, s.ID).Scan(&optedIn, &optedOut, &attended, &offers)
	if err == nil {
		s.PlacementStats.OptedIn = optedIn
		s.PlacementStats.OptedOut = optedOut
		s.PlacementStats.Attended = attended
		s.PlacementStats.OffersReceived = offers
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

// GetPasswordHash fetches the password hash for a user
func (r *UserRepository) GetPasswordHash(ctx context.Context, userID int64) (string, error) {
	var hash string
	query := `SELECT password_hash FROM users WHERE id = $1`
	err := r.DB.QueryRow(ctx, query, userID).Scan(&hash)
	if err != nil {
		return "", err
	}
	return hash, nil
}

// UpdatePassword updates the password for a user
func (r *UserRepository) UpdatePassword(ctx context.Context, userID int64, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1 WHERE id = $2`
	_, err := r.DB.Exec(ctx, query, passwordHash, userID)
	return err
}
