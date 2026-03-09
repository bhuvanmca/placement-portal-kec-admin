package repository

import (
	"context"

	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BroadcastRepository struct {
	DB *pgxpool.Pool
}

func NewBroadcastRepository(db *pgxpool.Pool) *BroadcastRepository {
	return &BroadcastRepository{DB: db}
}

func (r *BroadcastRepository) CreateTemplate(tmpl *models.BroadcastTemplate) error {
	query := `INSERT INTO broadcast_templates (name, type, content, variables, created_by) 
              VALUES ($1, $2, $3, $4, $5)`
	_, err := r.DB.Exec(context.Background(), query, tmpl.Name, tmpl.Type, tmpl.Content, tmpl.Variables, tmpl.CreatedBy)
	return err
}

func (r *BroadcastRepository) GetAllTemplates() ([]models.BroadcastTemplate, error) {
	query := `SELECT id, name, type, content, variables, created_by, created_at FROM broadcast_templates ORDER BY created_at DESC`
	rows, err := r.DB.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.BroadcastTemplate
	for rows.Next() {
		var t models.BroadcastTemplate
		if err := rows.Scan(
			&t.ID, &t.Name, &t.Type, &t.Content, &t.Variables, &t.CreatedBy, &t.CreatedAt,
		); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *BroadcastRepository) GetTemplateByID(id int64) (*models.BroadcastTemplate, error) {
	var tmpl models.BroadcastTemplate
	query := `SELECT id, name, type, content, variables, created_by, created_at FROM broadcast_templates WHERE id = $1`
	err := r.DB.QueryRow(context.Background(), query, id).Scan(
		&tmpl.ID, &tmpl.Name, &tmpl.Type, &tmpl.Content, &tmpl.Variables, &tmpl.CreatedBy, &tmpl.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &tmpl, nil
}

func (r *BroadcastRepository) DeleteTemplate(id int64) error {
	query := `DELETE FROM broadcast_templates WHERE id = $1`
	_, err := r.DB.Exec(context.Background(), query, id)
	return err
}

func (r *BroadcastRepository) UpdateTemplate(tmpl *models.BroadcastTemplate) error {
	query := `UPDATE broadcast_templates 
              SET name = $1, type = $2, content = $3, variables = $4 
              WHERE id = $5`
	_, err := r.DB.Exec(context.Background(), query, tmpl.Name, tmpl.Type, tmpl.Content, tmpl.Variables, tmpl.ID)
	return err
}
