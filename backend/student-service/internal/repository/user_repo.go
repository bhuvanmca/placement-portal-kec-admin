package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/student-service/internal/models"
)

type UserRepository struct {
	DB *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) UpdateDocumentPath(ctx context.Context, userID int64, docType, path string) error {
	var query string
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
		query = `UPDATE users SET profile_photo_url = $2 WHERE id = $1`
	default:
		return fmt.Errorf("invalid document type")
	}
	_, err := r.DB.Exec(ctx, query, userID, path)
	return err
}

func (r *UserRepository) GetRegisterNumber(ctx context.Context, userID int64) (string, error) {
	var regNo string
	query := `SELECT register_number FROM student_personal WHERE user_id = $1`
	err := r.DB.QueryRow(ctx, query, userID).Scan(&regNo)
	if err != nil {
		return "", fmt.Errorf("student profile not found (register number missing)")
	}
	return regNo, nil
}

func (r *UserRepository) UpdateFCMToken(ctx context.Context, userID int64, token string) error {
	_, err := r.DB.Exec(ctx, `UPDATE users SET fcm_token = $1 WHERE id = $2`, token, userID)
	return err
}

func (r *UserRepository) GetPasswordHash(ctx context.Context, userID int64) (string, error) {
	var hash string
	err := r.DB.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&hash)
	return hash, err
}

func (r *UserRepository) UpdatePassword(ctx context.Context, userID int64, passwordHash string) error {
	_, err := r.DB.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, passwordHash, userID)
	return err
}

func (r *UserRepository) UpdateUserProfile(ctx context.Context, userID int64, name, photoURL string) error {
	_, err := r.DB.Exec(ctx, `UPDATE users SET name = $1, profile_photo_url = $2, updated_at = NOW() WHERE id = $3`, name, photoURL, userID)
	return err
}

func (r *UserRepository) GetUserByID(ctx context.Context, userID int64) (*models.User, error) {
	var user models.User
	query := `SELECT id, email, password_hash, role, name, department_code, profile_photo_url, COALESCE(fcm_token, ''), is_active, is_blocked, last_login, created_at, updated_at FROM users WHERE id = $1`
	err := r.DB.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Name, &user.DepartmentCode,
		&user.ProfilePhotoURL, &user.FCMToken, &user.IsActive, &user.IsBlocked,
		&user.LastLogin, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) SaveOTP(ctx context.Context, email, otp string) error {
	query := `INSERT INTO password_resets (email, otp, created_at, expires_at) VALUES ($1, $2, NOW(), NOW() + INTERVAL '10 minutes')
	           ON CONFLICT (email) DO UPDATE SET otp = $2, created_at = NOW(), expires_at = NOW() + INTERVAL '10 minutes'`
	_, err := r.DB.Exec(ctx, query, email, otp)
	return err
}

// PermissionRepository handles field permission checks
type PermissionRepository struct {
	DB *pgxpool.Pool
}

func NewPermissionRepository(db *pgxpool.Pool) *PermissionRepository {
	return &PermissionRepository{DB: db}
}

func (r *PermissionRepository) GetPermission(fieldName string) (bool, error) {
	var isEnabled bool
	err := r.DB.QueryRow(context.Background(), `SELECT is_enabled FROM field_permissions WHERE field_name = $1`, fieldName).Scan(&isEnabled)
	if err != nil {
		return true, nil // Default: allow if not found
	}
	return isEnabled, nil
}

func (r *PermissionRepository) CreateChangeRequest(req models.StudentChangeRequest) error {
	query := `INSERT INTO student_change_requests (student_id, field_name, old_value, new_value, status, created_at) 
              VALUES ($1, $2, $3, $4, 'pending', NOW())`
	_, err := r.DB.Exec(context.Background(), query, req.StudentID, req.FieldName, req.OldValue, req.NewValue)
	return err
}

// ActivityLogRepository handles activity logging
type ActivityLogRepository struct {
	DB *pgxpool.Pool
}

func NewActivityLogRepository(db *pgxpool.Pool) *ActivityLogRepository {
	return &ActivityLogRepository{DB: db}
}

func (r *ActivityLogRepository) CreateLog(ctx context.Context, log models.ActivityLog) error {
	query := `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at) 
              VALUES ($1, $2, $3, $4, $5, $6, NOW())`
	_, err := r.DB.Exec(ctx, query, log.UserID, log.Action, log.EntityType, log.EntityID, log.Details, log.IPAddress)
	return err
}
