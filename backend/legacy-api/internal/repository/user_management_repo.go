package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserManagementRepository struct {
	DB *pgxpool.Pool
}

func NewUserManagementRepository(db *pgxpool.Pool) *UserManagementRepository {
	return &UserManagementRepository{DB: db}
}

// ManagedUser represents an admin/coordinator user for management
type ManagedUser struct {
	ID             int64    `json:"id"`
	Email          string   `json:"email"`
	Role           string   `json:"role"`
	Name           *string  `json:"name"`
	DepartmentCode *string  `json:"department_code"`
	IsActive       bool     `json:"is_active"`
	IsBlocked      bool     `json:"is_blocked"`
	Permissions    []string `json:"permissions"`
	CreatedAt      string   `json:"created_at"`
	LastLogin      *string  `json:"last_login"`
}

// ActivityLogEntry represents a single audit log entry
// ActivityLogEntry represents a single audit log entry
type ActivityLogEntry struct {
	ID         int64  `json:"id"`
	UserID     int64  `json:"user_id"`
	UserEmail  string `json:"user_email"`
	UserName   string `json:"user_name"`
	UserRole   string `json:"user_role"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	Details    string `json:"details"` // JSON string
	IPAddress  string `json:"ip_address"`
	CreatedAt  string `json:"created_at"`
}

// ListManagedUsers returns all admin and coordinator users
func (r *UserManagementRepository) ListManagedUsers(ctx context.Context, search, roleFilter string) ([]ManagedUser, error) {
	query := `
		SELECT u.id, u.email, u.role, u.name, u.department_code, u.is_active, u.is_blocked,
			   TO_CHAR(u.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
			   CASE WHEN u.last_login IS NOT NULL 
			        THEN TO_CHAR(u.last_login, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
			        ELSE NULL END as last_login
		FROM users u
		WHERE u.role IN ('admin', 'coordinator')
	`

	args := []interface{}{}
	argId := 1

	if search != "" {
		query += fmt.Sprintf(" AND (u.name ILIKE $%d OR u.email ILIKE $%d)", argId, argId)
		args = append(args, "%"+search+"%")
		argId++
	}

	if roleFilter != "" && (roleFilter == "admin" || roleFilter == "coordinator") {
		query += fmt.Sprintf(" AND u.role = $%d", argId)
		args = append(args, roleFilter)
		argId++
	}

	query += " ORDER BY u.created_at DESC"

	rows, err := r.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []ManagedUser
	for rows.Next() {
		var u ManagedUser
		if err := rows.Scan(&u.ID, &u.Email, &u.Role, &u.Name, &u.DepartmentCode,
			&u.IsActive, &u.IsBlocked, &u.CreatedAt, &u.LastLogin); err != nil {
			return nil, err
		}

		// Fetch permissions for each user
		perms, _ := r.GetUserPermissions(ctx, u.ID)
		u.Permissions = perms

		users = append(users, u)
	}
	return users, nil
}

// GetUserPermissions returns granted permission keys for a user
func (r *UserManagementRepository) GetUserPermissions(ctx context.Context, userID int64) ([]string, error) {
	query := `SELECT permission_key FROM role_permissions WHERE user_id = $1 AND is_granted = TRUE`
	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return []string{}, nil
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var p string
		if rows.Scan(&p) == nil {
			perms = append(perms, p)
		}
	}
	if perms == nil {
		perms = []string{}
	}
	return perms, nil
}

// CreateManagedUser creates a new admin or coordinator user
func (r *UserManagementRepository) CreateManagedUser(ctx context.Context, email, passwordHash, role string, name *string, deptCode *string) (int64, error) {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var userID int64
	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, role, name, department_code, is_active, is_blocked)
		 VALUES ($1, $2, $3, $4, $5, TRUE, FALSE) RETURNING id`,
		email, passwordHash, role, name, deptCode,
	).Scan(&userID)
	if err != nil {
		return 0, fmt.Errorf("failed to create user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return userID, nil
}

// UpdateManagedUser updates user details
func (r *UserManagementRepository) UpdateManagedUser(ctx context.Context, userID int64, name *string, role string, deptCode *string, isActive bool) error {
	_, err := r.DB.Exec(ctx,
		`UPDATE users SET name = $2, role = $3, department_code = $4, is_active = $5, updated_at = NOW() WHERE id = $1`,
		userID, name, role, deptCode, isActive,
	)
	return err
}

// DeleteManagedUser deletes a user (admin/coordinator only)
func (r *UserManagementRepository) DeleteManagedUser(ctx context.Context, userID int64) error {
	// Safety: Only delete admin/coordinator users
	result, err := r.DB.Exec(ctx,
		`DELETE FROM users WHERE id = $1 AND role IN ('admin', 'coordinator')`,
		userID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found or cannot be deleted")
	}
	return nil
}

// SetUserPermissions replaces all permissions for a user
func (r *UserManagementRepository) SetUserPermissions(ctx context.Context, userID int64, permissions []string, grantedBy int64) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Clear existing permissions
	_, err = tx.Exec(ctx, `DELETE FROM role_permissions WHERE user_id = $1`, userID)
	if err != nil {
		return err
	}

	// Insert new permissions
	for _, perm := range permissions {
		_, err = tx.Exec(ctx,
			`INSERT INTO role_permissions (user_id, permission_key, is_granted, granted_by) VALUES ($1, $2, TRUE, $3)`,
			userID, perm, grantedBy,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// LogActivity records an action in the activity log
func (r *UserManagementRepository) LogActivity(ctx context.Context, userID int64, action string, details string) error {
	// Defaulting EntityType/ID for generic logs, ideally passed in
	_, err := r.DB.Exec(ctx,
		`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'SYSTEM', '0', $3::jsonb, '127.0.0.1')`,
		userID, action, details,
	)
	return err
}

// GetActivityLog returns recent activity entries with sorting
func (r *UserManagementRepository) GetActivityLog(ctx context.Context, limit, offset int, sortBy, sortOrder string) ([]ActivityLogEntry, int, error) {
	// Get total count
	var total int
	r.DB.QueryRow(ctx, `SELECT COUNT(*) FROM activity_logs`).Scan(&total)

	// Validate sort parameters to prevent SQL injection
	allowedSorts := map[string]string{
		"created_at":  "al.created_at",
		"user_name":   "u.name",
		"user_role":   "u.role",
		"action":      "al.action",
		"entity_type": "al.entity_type",
		"details":     "al.details",
	}

	sortColumn, ok := allowedSorts[sortBy]
	if !ok {
		sortColumn = "al.created_at"
	}

	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "DESC"
	}

	query := fmt.Sprintf(`
		SELECT al.id, COALESCE(al.user_id, 0), 
			   COALESCE(u.email, 'deleted') as user_email,
			   COALESCE(u.name, u.email, 'Unknown') as user_name,
			   COALESCE(u.role, '') as user_role,
			   al.action,
			   COALESCE(al.entity_type, '') as entity_type,
			   COALESCE(al.entity_id, '') as entity_id,
			   COALESCE(al.details::text, '{}') as details,
			   COALESCE(al.ip_address, '') as ip_address,
			   TO_CHAR(al.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
		FROM activity_logs al
		LEFT JOIN users u ON al.user_id = u.id
		ORDER BY %s %s
		LIMIT $1 OFFSET $2
	`, sortColumn, sortOrder)

	rows, err := r.DB.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []ActivityLogEntry
	for rows.Next() {
		var e ActivityLogEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.UserEmail, &e.UserName, &e.UserRole, &e.Action, &e.EntityType, &e.EntityID, &e.Details, &e.IPAddress, &e.CreatedAt); err != nil {
			return nil, 0, err
		}
		entries = append(entries, e)
	}
	return entries, total, nil
}
