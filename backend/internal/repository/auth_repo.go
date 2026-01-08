package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	DB *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{DB: db}
}

// CreateUser inserts a new user safely
func (r *UserRepository) CreateUser(ctx context.Context, user *models.User) error {
	query := `
        INSERT INTO users (email, password_hash, role, is_active, is_blocked)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
    `
	// We use QueryRow because we want the ID back
	err := r.DB.QueryRow(ctx, query,
		user.Email,
		user.PasswordHash,
		user.Role,
		true,  // is_active default
		false, // is_blocked default
	).Scan(&user.ID, &user.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetUserByEmail finds a user for login
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, password_hash, role, is_active, is_blocked FROM users WHERE email = $1`

	var user models.User
	err := r.DB.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.IsActive, &user.IsBlocked,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// SaveOTP stores the code with a 15-minute expiry
func (r *UserRepository) SaveOTP(ctx context.Context, email, otp string) error {
	// Upsert: If an OTP already exists for this email, overwrite it
	query := `
        INSERT INTO password_resets (email, otp_code, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
        ON CONFLICT (email) 
        DO UPDATE SET otp_code = $2, expires_at = NOW() + INTERVAL '15 minutes'
    `
	_, err := r.DB.Exec(ctx, query, email, otp)
	return err
}

// VerifyOTP checks if the code matches and hasn't expired
func (r *UserRepository) VerifyOTP(ctx context.Context, email, otp string) (bool, error) {
	var count int
	query := `
        SELECT COUNT(*) FROM password_resets 
        WHERE email = $1 AND otp_code = $2 AND expires_at > NOW()
    `
	err := r.DB.QueryRow(ctx, query, email, otp).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// ResetPassword updates the user's password and clears the OTP
func (r *UserRepository) ResetPassword(ctx context.Context, email, newHash string) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Update Password
	_, err = tx.Exec(ctx, "UPDATE users SET password_hash = $1 WHERE email = $2", newHash, email)
	if err != nil {
		return err
	}

	// 2. Delete OTP (Prevent replay attacks)
	_, err = tx.Exec(ctx, "DELETE FROM password_resets WHERE email = $1", email)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeleteExpiredOTPs removes junk data from the password_resets table
func (r *UserRepository) DeleteExpiredOTPs(ctx context.Context) (int64, error) {
	query := `DELETE FROM password_resets WHERE expires_at < NOW()`

	result, err := r.DB.Exec(ctx, query)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected(), nil
}
