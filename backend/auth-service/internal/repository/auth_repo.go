package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/auth-service/internal/models"
)

type AuthRepository struct {
	DB *pgxpool.Pool
}

func NewAuthRepository(db *pgxpool.Pool) *AuthRepository {
	return &AuthRepository{DB: db}
}

// CreateUser inserts a standard registration record into the auth.users schema
func (r *AuthRepository) CreateUser(ctx context.Context, input *models.RegisterInput, passwordHash string) (*models.User, error) {
	// Name can be directly from input for admins/coordinators, or synced later for students.
	query := `
		INSERT INTO users (email, password_hash, role, name, department_code, is_active) 
		VALUES ($1, $2, $3, $4, $5, true) 
		RETURNING id, email, role, name, department_code, is_active, is_blocked, created_at
	`

	var user models.User
	err := r.DB.QueryRow(ctx, query, input.Email, passwordHash, input.Role, input.FullName, input.DepartmentCode).Scan(
		&user.ID, &user.Email, &user.Role, &user.Name, &user.DepartmentCode,
		&user.IsActive, &user.IsBlocked, &user.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// GetUserByEmail for login and password resets
func (r *AuthRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, role, name, department_code, profile_photo_url, is_active, is_blocked, last_login 
		FROM users 
		WHERE email = $1
	`
	var user models.User
	err := r.DB.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Name,
		&user.DepartmentCode, &user.ProfilePhotoURL, &user.IsActive, &user.IsBlocked, &user.LastLogin,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	return &user, nil
}

// UpdateLastLogin updates the login timestamp
func (r *AuthRepository) UpdateLastLogin(ctx context.Context, userID int64) error {
	_, err := r.DB.Exec(ctx, `UPDATE users SET last_login = NOW() WHERE id = $1`, userID)
	return err
}

// ResetPassword
func (r *AuthRepository) ResetPassword(ctx context.Context, email, passwordHash string) error {
	_, err := r.DB.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`, passwordHash, email)
	return err
}

// SaveOTP saves OTP securely (if keeping simple table or redis. Assuming previous implementation used password_resets)
func (r *AuthRepository) SaveOTP(ctx context.Context, email, otp string) error {
	query := `
		INSERT INTO auth.password_resets (email, otp, expires_at) 
		VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
		ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at
	`
	// Wait, we need to create auth.password_resets in the schema.
	_, err := r.DB.Exec(ctx, query, email, otp)
	return err
}

// VerifyOTP verifies token TTL
func (r *AuthRepository) VerifyOTP(ctx context.Context, email, otp string) (bool, error) {
	var count int
	query := `SELECT count(*) FROM auth.password_resets WHERE email = $1 AND otp = $2 AND expires_at > NOW()`
	err := r.DB.QueryRow(ctx, query, email, otp).Scan(&count)
	return count > 0, err
}

// GetUserPermissions fetches permissions specifically from admin.role_permissions
func (r *AuthRepository) GetUserPermissions(ctx context.Context, userID int64) ([]string, error) {
	query := `SELECT permission_key FROM admin.role_permissions WHERE user_id = $1 AND is_granted = true`
	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var perm string
		if err := rows.Scan(&perm); err != nil {
			continue
		}
		permissions = append(permissions, perm)
	}
	return permissions, nil
}
