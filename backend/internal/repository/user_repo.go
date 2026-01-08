package repository

import (
	"context"
	"fmt"
	"strconv"

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

	// 2. Insert Profile (Added batch_year)
	stmtProfile := `INSERT INTO student_personal (user_id, full_name, register_number, department, batch_year) VALUES ($1, $2, $3, $4, $5)`

	for _, row := range students {
		// Updated CSV Row: [0]Email, [1]Name, [2]RegNo, [3]Dept, [4]BatchYear, [5]Password

		// Safety check to avoid index out of range panic
		if len(row) < 6 {
			return count, fmt.Errorf("invalid row format: expected 6 columns, got %d", len(row))
		}

		email := row[0]
		name := row[1]
		regNo := row[2]
		dept := row[3]

		// Convert Batch Year string to int
		batchYear, err := strconv.Atoi(row[4])
		if err != nil {
			return count, fmt.Errorf("invalid batch year for %s: %v", email, err)
		}

		rawPass := row[5]

		// Hash password
		hashedPass, _ := bcrypt.GenerateFromPassword([]byte(rawPass), bcrypt.DefaultCost)

		var userID int64
		err = tx.QueryRow(ctx, stmtUser, email, string(hashedPass)).Scan(&userID)
		if err != nil {
			return count, fmt.Errorf("failed to insert user %s: %w", email, err)
		}

		// Pass batchYear to the query
		_, err = tx.Exec(ctx, stmtProfile, userID, name, regNo, dept, batchYear)
		if err != nil {
			return count, fmt.Errorf("failed to insert profile for %s: %w", email, err)
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

// GetStudents fetches students with dynamic filters (dept, batch, search term)
func (r *UserRepository) GetStudents(ctx context.Context, department string, batchYear int, search string) ([]map[string]interface{}, error) {
	// Base Query: Join Users and Profile
	query := `
        SELECT u.id, u.email, u.is_blocked, sp.full_name, sp.register_number, sp.department, sp.batch_year, sp.mobile_number
        FROM users u
        JOIN student_personal sp ON u.id = sp.user_id
        WHERE u.role = 'student'
    `
	var args []interface{}
	argCounter := 1

	// Dynamic Filters
	if department != "" {
		query += fmt.Sprintf(" AND sp.department = $%d", argCounter)
		args = append(args, department)
		argCounter++
	}
	if batchYear > 0 {
		query += fmt.Sprintf(" AND sp.batch_year = $%d", argCounter)
		args = append(args, batchYear)
		argCounter++
	}
	if search != "" {
		// Partial search on Name OR Register Number
		query += fmt.Sprintf(" AND (sp.full_name ILIKE $%d OR sp.register_number ILIKE $%d)", argCounter, argCounter)
		args = append(args, "%"+search+"%", "%"+search+"%")
		argCounter++
	}

	query += ` ORDER BY sp.register_number ASC`

	rows, err := r.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []map[string]interface{}
	for rows.Next() {
		var id int64
		var email, name, regNo, dept, mobile string
		var batch int
		var isBlocked bool

		rows.Scan(&id, &email, &isBlocked, &name, &regNo, &dept, &batch, &mobile)

		students = append(students, map[string]interface{}{
			"id":              id,
			"email":           email,
			"full_name":       name,
			"register_number": regNo,
			"department":      dept,
			"batch_year":      batch,
			"mobile":          mobile,
			"is_blocked":      isBlocked,
		})
	}
	return students, nil
}
