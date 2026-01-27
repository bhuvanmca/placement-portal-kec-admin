package repository

import (
	"context"
	"fmt" // Need this for Tx
	"time"

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
			user_id, full_name, register_number, batch_year, department, mobile_number, student_type, placement_willingness
		) VALUES ($1, $2, $3, $4, $5, $6, 'Regular', 'Interested')
	`
	if _, err := tx.Exec(ctx, queryPersonal, userID, input.FullName, input.RegisterNumber, input.BatchYear, input.Department, input.MobileNumber); err != nil {
		return fmt.Errorf("failed to create student profile: %w", err)
	}

	// 3. Initialize Logistics (Academics & Documents) empty to avoid JOIN issues later
	if _, err := tx.Exec(ctx, "INSERT INTO student_academics (user_id) VALUES ($1)", userID); err != nil {
		return fmt.Errorf("failed to init academics: %w", err)
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
        SET mobile_number = $1, city = $2, state = $3, 
            about_me = $4, 
            placement_willingness = COALESCE(NULLIF($5, ''), student_personal.placement_willingness),
            social_links = $6, language_skills = $7,
            dob = $8::date,
            updated_at = NOW()
        WHERE user_id = $9
    `
	// Note: language_skills and social_links are JSONB in DB but currently mapped as []string and map[string]string.
	// pgx handles JSON marshalling if we pass structs/maps for jsonb columns, but we might need explicit types.
	// input.LanguageSkills is []string -> JSONB array
	// input.SocialLinks is map[string]string -> JSONB object
	if _, err := tx.Exec(ctx, queryPersonal,
		input.MobileNumber, input.City, input.State,
		input.AboutMe, input.PlacementWillingness,
		input.SocialLinks, input.LanguageSkills,
		input.Dob,
		userID); err != nil {
		return fmt.Errorf("failed to update personal info: %w", err)
	}

	// 3. Update Academics (CGPA, Backlogs, etc.)
	// Upserting because we initialized it empty in BulkCreate, but just in case
	queryAcademics := `
        INSERT INTO student_academics (
            user_id, 
            tenth_mark, tenth_board, tenth_year_pass, tenth_institution,
            twelfth_mark, twelfth_board, twelfth_year_pass, twelfth_institution,
            diploma_mark, diploma_year_pass, diploma_institution,
            ug_cgpa, pg_cgpa, current_backlogs, history_of_backlogs, gap_years, gap_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (user_id) DO UPDATE SET
            tenth_mark = EXCLUDED.tenth_mark, tenth_board = EXCLUDED.tenth_board, 
            tenth_year_pass = EXCLUDED.tenth_year_pass, tenth_institution = EXCLUDED.tenth_institution,
            twelfth_mark = EXCLUDED.twelfth_mark, twelfth_board = EXCLUDED.twelfth_board,
            twelfth_year_pass = EXCLUDED.twelfth_year_pass, twelfth_institution = EXCLUDED.twelfth_institution,
            diploma_mark = EXCLUDED.diploma_mark, diploma_year_pass = EXCLUDED.diploma_year_pass, 
            diploma_institution = EXCLUDED.diploma_institution,
            ug_cgpa = EXCLUDED.ug_cgpa, pg_cgpa = EXCLUDED.pg_cgpa, 
            current_backlogs = EXCLUDED.current_backlogs, history_of_backlogs = EXCLUDED.history_of_backlogs,
            gap_years = EXCLUDED.gap_years, gap_reason = EXCLUDED.gap_reason
    `
	if _, err := tx.Exec(ctx, queryAcademics,
		userID,
		input.TenthMark, input.TenthBoard, input.TenthYearPass, input.TenthInstitution,
		input.TwelfthMark, input.TwelfthBoard, input.TwelfthYearPass, input.TwelfthInstitution,
		input.DiplomaMark, input.DiplomaYearPass, input.DiplomaInstitution,
		input.UgCgpa, input.PgCgpa, input.CurrentBacklogs, input.HistoryBacklogs,
		input.GapYears, input.GapReason,
	); err != nil {
		return fmt.Errorf("failed to update academics: %w", err)
	}

	// 4. Update Documents
	// We only update if the URL is provided (non-empty string)
	// Or we can just upsert indiscriminately if the frontend sends the existing ones.
	// Assuming frontend sends what it has.
	queryDocs := `
		INSERT INTO student_documents (user_id, resume_url, profile_photo_url, aadhar_card_url, pan_card_url)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			resume_url = COALESCE(NULLIF(EXCLUDED.resume_url, ''), student_documents.resume_url),
			profile_photo_url = COALESCE(NULLIF(EXCLUDED.profile_photo_url, ''), student_documents.profile_photo_url),
			aadhar_card_url = COALESCE(NULLIF(EXCLUDED.aadhar_card_url, ''), student_documents.aadhar_card_url),
			pan_card_url = COALESCE(NULLIF(EXCLUDED.pan_card_url, ''), student_documents.pan_card_url)
	`
	// Note: We use COALESCE(NULLIF(..., ''), ...) to ensure that empty strings don't overwrite existing valid URLs
	// unless that's intended, but typically "update profile" might send partial data.
	// However, usually partial updates are handled by only including fields that change.
	// The struct has fields as strings, so if they are empty "", we treat them as "do not update" or "no change".

	if _, err := tx.Exec(ctx, queryDocs, userID, input.ResumeURL, input.ProfilePhotoURL, input.AadharCardURL, input.PanCardURL); err != nil {
		return fmt.Errorf("failed to update documents: %w", err)
	}

	// 4. Commit Transaction
	return tx.Commit(ctx)
}

// GetStudentFullProfile fetches all details by joining tables
func (r *StudentRepository) GetStudentFullProfile(ctx context.Context, userID int64) (*models.StudentFullProfile, error) {
	query := `
        SELECT 
            u.id, u.email, u.is_blocked, u.last_login,
            sp.full_name, sp.register_number, sp.department, sp.batch_year, 
            sp.student_type, sp.placement_willingness,
            COALESCE(sp.mobile_number, ''), COALESCE(sp.gender, ''), COALESCE(sp.dob::text, ''),
            COALESCE(sp.city, ''), COALESCE(sp.state, ''),
            sp.social_links, sp.language_skills, COALESCE(sp.about_me, ''),

            COALESCE(sa.tenth_mark, 0), COALESCE(sa.twelfth_mark, 0), COALESCE(sa.diploma_mark, 0),
            COALESCE(sa.ug_cgpa, 0.0), COALESCE(sa.pg_cgpa, 0.0), 
            COALESCE(sa.current_backlogs, 0), COALESCE(sa.history_of_backlogs, 0),
            COALESCE(sa.gap_years, 0), COALESCE(sa.gap_reason, ''),

            COALESCE(sd.resume_url, ''), COALESCE(sd.profile_photo_url, ''),
            COALESCE(sd.aadhar_card_url, ''), COALESCE(sd.pan_card_url, '')
        FROM users u
        LEFT JOIN student_personal sp ON u.id = sp.user_id
        LEFT JOIN student_academics sa ON u.id = sa.user_id
        LEFT JOIN student_documents sd ON u.id = sd.user_id
        WHERE u.id = $1 AND u.role = 'student'
    `

	var s models.StudentFullProfile
	var lastLogin *time.Time
	// JSONB placeholders
	// We need safe scanning for JSONB fields
	var socialLinks map[string]string
	var langSkills []string

	err := r.DB.QueryRow(ctx, query, userID).Scan(
		&s.ID, &s.Email, &s.IsBlocked, &lastLogin,
		&s.FullName, &s.RegisterNumber, &s.Department, &s.BatchYear,
		&s.StudentType, &s.PlacementWillingness,
		&s.MobileNumber, &s.Gender, &s.Dob,
		&s.City, &s.State,
		&socialLinks, &langSkills, &s.AboutMe,
		&s.TenthMark, &s.TwelfthMark, &s.DiplomaMark,
		&s.UgCgpa, &s.PgCgpa,
		&s.CurrentBacklogs, &s.HistoryBacklogs,
		&s.GapYears, &s.GapReason,
		&s.ResumeURL, &s.ProfilePhotoURL,
		&s.AadharCardURL, &s.PanCardURL,
	)

	if err != nil {
		return nil, fmt.Errorf("student not found or database error: %w", err)
	}

	s.LastLogin = lastLogin
	s.SocialLinks = socialLinks
	s.LanguageSkills = langSkills

	return &s, nil
}
