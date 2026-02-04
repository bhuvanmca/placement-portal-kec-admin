package repository

import (
	"context"
	"encoding/json"
	"fmt" // Need this for Tx

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StudentRepository struct {
	DB *pgxpool.Pool
}

func NewStudentRepository(db *pgxpool.Pool) *StudentRepository {
	return &StudentRepository{DB: db}
}

// CreateStudent creates a new student user and initializes their profile
func (r *StudentRepository) CreateStudent(ctx context.Context, user *models.User, input models.CreateStudentInput) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Insert into Users
	var userID int64
	queryUser := `INSERT INTO users (email, password_hash, role, is_active, created_at, updated_at) 
                  VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`

	err = tx.QueryRow(ctx, queryUser, user.Email, user.PasswordHash, user.Role, user.IsActive).Scan(&userID)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// 2. Insert into Student Personal
	// Note: We are setting the initial data provided by admin
	queryPersonal := `
		INSERT INTO student_personal (
			user_id, full_name, register_number, batch_year, department, student_type, placement_willingness
		) VALUES ($1, $2, $3, $4, $5, 'Regular', 'Interested')
	`
	if _, err := tx.Exec(ctx, queryPersonal, userID, input.FullName, input.RegisterNumber, input.BatchYear, input.Department); err != nil {
		return fmt.Errorf("failed to create student profile: %w", err)
	}

	// 3. Initialize Logistics (Academics & Documents) empty to avoid JOIN issues later
	if _, err := tx.Exec(ctx, "INSERT INTO student_schooling (user_id) VALUES ($1)", userID); err != nil {
		return fmt.Errorf("failed to init academic history: %w", err)
	}
	if _, err := tx.Exec(ctx, "INSERT INTO student_documents (user_id) VALUES ($1)", userID); err != nil {
		return fmt.Errorf("failed to init documents: %w", err)
	}

	return tx.Commit(ctx)
}

// UpdateStudentProfile updates contact, personal, and academic stats in one go
func (r *StudentRepository) UpdateStudentProfile(ctx context.Context, userID int64, input models.UpdateProfileInput) error {
	// 1. Start Transaction
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 2. Update Personal (Mobile, Skills, Address, etc.)
	queryPersonal := `
        UPDATE student_personal 
        SET mobile_number = $1, address_line_1 = $2, address_line_2 = $3, state = $4, 
            placement_willingness = COALESCE(NULLIF($5, ''), student_personal.placement_willingness),
            social_links = $6, language_skills = $7,
            dob = NULLIF($8, '')::date,
            pan_number = $9, aadhar_number = $10,
            updated_at = NOW()
        WHERE user_id = $11
    `
	if _, err := tx.Exec(ctx, queryPersonal,
		input.MobileNumber, input.AddressLine1, input.AddressLine2, input.State,
		input.PlacementWillingness,
		input.SocialLinks, input.LanguageSkills,
		input.Dob,
		input.PanNumber, input.AadharNumber,
		userID); err != nil {
		return fmt.Errorf("failed to update personal info: %w", err)
	}

	// 3. Update Academics (Schooling & Degrees)

	// 3.1 Upsert Schooling
	querySchooling := `
        INSERT INTO student_schooling (
            user_id, 
            tenth_mark, tenth_board, tenth_year_pass, tenth_institution,
            twelfth_mark, twelfth_board, twelfth_year_pass, twelfth_institution,
            diploma_mark, diploma_year_pass, diploma_institution,
            current_backlogs, history_of_backlogs, gap_years, gap_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (user_id) DO UPDATE SET
            tenth_mark = EXCLUDED.tenth_mark, tenth_board = EXCLUDED.tenth_board, 
            tenth_year_pass = EXCLUDED.tenth_year_pass, tenth_institution = EXCLUDED.tenth_institution,
            twelfth_mark = EXCLUDED.twelfth_mark, twelfth_board = EXCLUDED.twelfth_board,
            twelfth_year_pass = EXCLUDED.twelfth_year_pass, twelfth_institution = EXCLUDED.twelfth_institution,
            diploma_mark = EXCLUDED.diploma_mark, diploma_year_pass = EXCLUDED.diploma_year_pass, 
            diploma_institution = EXCLUDED.diploma_institution,
            current_backlogs = EXCLUDED.current_backlogs, history_of_backlogs = EXCLUDED.history_of_backlogs,
            gap_years = EXCLUDED.gap_years, gap_reason = EXCLUDED.gap_reason
    `
	if _, err := tx.Exec(ctx, querySchooling,
		userID,
		input.TenthMark, input.TenthBoard, input.TenthYearPass, input.TenthInstitution,
		input.TwelfthMark, input.TwelfthBoard, input.TwelfthYearPass, input.TwelfthInstitution,
		input.DiplomaMark, input.DiplomaYearPass, input.DiplomaInstitution,
		input.CurrentBacklogs, input.HistoryBacklogs, input.GapYears, input.GapReason,
	); err != nil {
		return fmt.Errorf("failed to update schooling: %w", err)
	}

	// 3.2 Upsert Degrees (Score Cards Only)

	// Helper to format semesters
	ugMap := make(map[string]float64)
	if input.UgGpaS1 > 0 {
		ugMap["1"] = input.UgGpaS1
	}
	if input.UgGpaS2 > 0 {
		ugMap["2"] = input.UgGpaS2
	}
	if input.UgGpaS3 > 0 {
		ugMap["3"] = input.UgGpaS3
	}
	if input.UgGpaS4 > 0 {
		ugMap["4"] = input.UgGpaS4
	}
	if input.UgGpaS5 > 0 {
		ugMap["5"] = input.UgGpaS5
	}
	if input.UgGpaS6 > 0 {
		ugMap["6"] = input.UgGpaS6
	}
	if input.UgGpaS7 > 0 {
		ugMap["7"] = input.UgGpaS7
	}
	if input.UgGpaS8 > 0 {
		ugMap["8"] = input.UgGpaS8
	}
	if input.UgGpaS9 > 0 {
		ugMap["9"] = input.UgGpaS9
	}
	if input.UgGpaS10 > 0 {
		ugMap["10"] = input.UgGpaS10
	}
	ugJson, _ := json.Marshal(ugMap)

	pgMap := make(map[string]float64)
	if input.PgGpaS1 > 0 {
		pgMap["1"] = input.PgGpaS1
	}
	if input.PgGpaS2 > 0 {
		pgMap["2"] = input.PgGpaS2
	}
	if input.PgGpaS3 > 0 {
		pgMap["3"] = input.PgGpaS3
	}
	if input.PgGpaS4 > 0 {
		pgMap["4"] = input.PgGpaS4
	}
	if input.PgGpaS5 > 0 {
		pgMap["5"] = input.PgGpaS5
	}
	if input.PgGpaS6 > 0 {
		pgMap["6"] = input.PgGpaS6
	}
	if input.PgGpaS7 > 0 {
		pgMap["7"] = input.PgGpaS7
	}
	if input.PgGpaS8 > 0 {
		pgMap["8"] = input.PgGpaS8
	}
	pgJson, _ := json.Marshal(pgMap)

	// Query for Degree Upsert
	// Columns: user_id, degree_level, year_pass, cgpa, semester_gpas
	queryDegree := `
        INSERT INTO student_degrees (
			user_id, degree_level, year_pass, cgpa, semester_gpas
		)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, degree_level) DO UPDATE SET
			year_pass = EXCLUDED.year_pass,
            cgpa = EXCLUDED.cgpa,
            semester_gpas = EXCLUDED.semester_gpas
    `

	// Upsert UG
	if _, err := tx.Exec(ctx, queryDegree,
		userID, "UG", input.UgYearPass, input.UgCgpa, ugJson); err != nil {
		return fmt.Errorf("failed to update UG degree: %w", err)
	}

	// Upsert PG
	if _, err := tx.Exec(ctx, queryDegree,
		userID, "PG", input.PgYearPass, input.PgCgpa, pgJson); err != nil {
		return fmt.Errorf("failed to update PG degree: %w", err)
	}

	// 4. Update Documents
	queryDocs := `
		INSERT INTO student_documents (user_id, resume_url, profile_photo_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id) DO UPDATE SET
			resume_url = COALESCE(NULLIF(EXCLUDED.resume_url, ''), student_documents.resume_url),
			profile_photo_url = COALESCE(NULLIF(EXCLUDED.profile_photo_url, ''), student_documents.profile_photo_url)
	`
	if _, err := tx.Exec(ctx, queryDocs, userID, input.ResumeURL, input.ProfilePhotoURL); err != nil {
		return fmt.Errorf("failed to update documents: %w", err)
	}

	// 5. Commit Transaction
	return tx.Commit(ctx)
}

// GetStudentFullProfile fetches all details by joining tables
func (r *StudentRepository) GetStudentFullProfile(ctx context.Context, userID int64) (*models.StudentFullProfile, error) {
	// 1. Basic Profile Query (Score Only)
	query := `
        SELECT 
            u.id, u.email, u.is_blocked, u.last_login,
            sp.full_name, sp.register_number, sp.department, COALESCE(dm.type, 'UG'), sp.batch_year, 
            sp.student_type, sp.placement_willingness,
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

            COALESCE(sd.resume_url, ''), COALESCE(sd.profile_photo_url, ''),
            sd.resume_updated_at
        FROM users u
        LEFT JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN departments dm ON sp.department = dm.code
        LEFT JOIN student_schooling sch ON u.id = sch.user_id
        
        LEFT JOIN student_degrees d_ug ON u.id = d_ug.user_id AND d_ug.degree_level = 'UG'
        LEFT JOIN student_degrees d_pg ON u.id = d_pg.user_id AND d_pg.degree_level = 'PG'
        
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE u.id = $1 AND u.role = 'student'
    `

	var s models.StudentFullProfile
	var socialLinksBytes, languageSkillsBytes []byte
	var ugSemesterGpasBytes, pgSemesterGpasBytes []byte

	err := r.DB.QueryRow(ctx, query, userID).Scan(
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
	)
	if err != nil {
		fmt.Printf("GetStudentFullProfile Scan Error for user %d: %v\n", userID, err)
		return nil, fmt.Errorf("failed to fetch profile: %w", err)
	}

	// Unmarshal JSONB fields
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

	// 1. Calculate Eligible Drives
	// Criteria: Status Open/Closed/Ongoing (not draft), Batch matches, Dept matches, CGPA & Backlogs criteria met.
	// Note: We construct simple JSON arrays for containment checks (e.g. '[2024]' and '["MCA"]')
	eligibleQuery := `
		SELECT count(*) 
		FROM placement_drives 
		WHERE status != 'draft' AND status != 'cancelled'
		AND eligible_batches @> $1::jsonb
		AND eligible_departments @> $2::jsonb
		AND (min_cgpa IS NULL OR min_cgpa <= $3)
		AND (max_backlogs_allowed IS NULL OR max_backlogs_allowed >= $4)
	`
	// Construct JSONB representations for query
	batchJson := fmt.Sprintf("[%d]", s.BatchYear)
	deptJson := fmt.Sprintf("[\"%s\"]", s.Department)

	var eligibleCount int
	// We use 0.0 if CGPA is somehow 0, assuming freshers might have 0 initially
	err = r.DB.QueryRow(ctx, eligibleQuery, batchJson, deptJson, s.UgCgpa, s.CurrentBacklogs).Scan(&eligibleCount)
	if err == nil {
		s.PlacementStats.EligibleDrives = eligibleCount
	}

	// 2. Application Stats
	// Count based on status in drive_applications
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
