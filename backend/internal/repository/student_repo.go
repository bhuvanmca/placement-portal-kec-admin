package repository

import (
	"context"
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

// UpdateStudentProfile updates contact, family, and academic stats in one go
func (r *StudentRepository) UpdateStudentProfile(ctx context.Context, userID int64, input models.UpdateProfileInput) error {
	// 1. Start Transaction
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	// Defer a rollback in case of panic/error. If Commit() is called, Rollback does nothing.
	defer tx.Rollback(ctx)

	// 2. Update Personal (Mobile, Skills)
	queryPersonal := `
        UPDATE student_personal 
        SET mobile_number = $1, language_skills = $2, updated_at = NOW()
        WHERE user_id = $3
    `
	if _, err := tx.Exec(ctx, queryPersonal, input.MobileNumber, input.LanguageSkills, userID); err != nil {
		return fmt.Errorf("failed to update personal info: %w", err)
	}

	// 3. Update Academics (CGPA, Backlogs)
	queryAcademics := `
        UPDATE student_academics 
        SET ug_cgpa = $1, pg_cgpa = $2, current_backlogs = $3, history_of_backlogs = $4
        WHERE user_id = $5
    `
	if _, err := tx.Exec(ctx, queryAcademics, input.UgCgpa, input.PgCgpa, input.CurrentBacklogs, input.HistoryBacklogs, userID); err != nil {
		return fmt.Errorf("failed to update academics: %w", err)
	}

	// 4. Update Address (Family Details Table)
	// Note: We use UPSERT (INSERT ON CONFLICT) here because this row might not exist yet
	queryAddress := `
        INSERT INTO student_family_details (user_id, alternate_email, address_line_1, city, state, pincode)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE 
        SET alternate_email = $2, address_line_1 = $3, city = $4, state = $5, pincode = $6
    `
	if _, err := tx.Exec(ctx, queryAddress, userID, input.AlternateEmail, input.AddressLine1, input.City, input.State, input.Pincode); err != nil {
		return fmt.Errorf("failed to update address: %w", err)
	}

	// 5. Commit Transaction
	return tx.Commit(ctx)
}
