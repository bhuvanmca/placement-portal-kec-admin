package repository

import (
	"context"

	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EligibilityRepository struct {
	DB *pgxpool.Pool
}

func NewEligibilityRepository(db *pgxpool.Pool) *EligibilityRepository {
	return &EligibilityRepository{DB: db}
}

func (r *EligibilityRepository) CreateTemplate(ctx context.Context, input models.CreateEligibilityTemplateInput, adminID int64) error {
	query := `
		INSERT INTO eligibility_templates (
			name, min_cgpa, tenth_percentage, twelfth_percentage,
			ug_min_cgpa, pg_min_cgpa, use_aggregate, aggregate_percentage,
			max_backlogs_allowed, eligible_gender, created_by, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
		) RETURNING id
	`
	var templateID int64
	err := r.DB.QueryRow(ctx, query,
		input.Name, input.MinCgpa, input.TenthPercentage, input.TwelfthPercentage,
		input.UGMinCGPA, input.PGMinCGPA, input.UseAggregate, input.AggregatePercentage,
		input.MaxBacklogsAllowed, input.EligibleGender, adminID,
	).Scan(&templateID)
	if err != nil {
		return err
	}

	if len(input.EligibleBatches) > 0 {
		batchQuery := `INSERT INTO eligibility_template_batches (template_id, batch_year) VALUES ($1, $2)`
		for _, batch := range input.EligibleBatches {
			if _, err := r.DB.Exec(ctx, batchQuery, templateID, batch); err != nil {
				return err
			}
		}
	}

	if len(input.EligibleDepartments) > 0 {
		deptQuery := `INSERT INTO eligibility_template_departments (template_id, department_code) VALUES ($1, $2)`
		for _, dept := range input.EligibleDepartments {
			if _, err := r.DB.Exec(ctx, deptQuery, templateID, dept); err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *EligibilityRepository) GetAllTemplates(ctx context.Context) ([]models.EligibilityTemplate, error) {
	query := `
		SELECT 
			id, name, min_cgpa, tenth_percentage, twelfth_percentage,
			ug_min_cgpa, pg_min_cgpa, use_aggregate, aggregate_percentage,
			max_backlogs_allowed, 
            COALESCE((SELECT jsonb_agg(etd.department_code) FROM eligibility_template_departments etd WHERE etd.template_id = eligibility_templates.id), '[]'::jsonb),
            COALESCE((SELECT jsonb_agg(etb.batch_year) FROM eligibility_template_batches etb WHERE etb.template_id = eligibility_templates.id), '[]'::jsonb),
			eligible_gender, created_by, created_at, updated_at
		FROM eligibility_templates
		ORDER BY name ASC
	`
	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.EligibilityTemplate
	for rows.Next() {
		var t models.EligibilityTemplate
		err := rows.Scan(
			&t.ID, &t.Name, &t.MinCgpa, &t.TenthPercentage, &t.TwelfthPercentage,
			&t.UGMinCGPA, &t.PGMinCGPA, &t.UseAggregate, &t.AggregatePercentage,
			&t.MaxBacklogsAllowed, &t.EligibleDepartments, &t.EligibleBatches,
			&t.EligibleGender, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *EligibilityRepository) UpdateTemplate(ctx context.Context, id int64, input models.CreateEligibilityTemplateInput) error {
	query := `
		UPDATE eligibility_templates
		SET name=$1, min_cgpa=$2, tenth_percentage=$3, twelfth_percentage=$4,
			ug_min_cgpa=$5, pg_min_cgpa=$6, use_aggregate=$7, aggregate_percentage=$8,
			max_backlogs_allowed=$9, eligible_gender=$10, updated_at=NOW()
		WHERE id=$11
	`
	_, err := r.DB.Exec(ctx, query,
		input.Name, input.MinCgpa, input.TenthPercentage, input.TwelfthPercentage,
		input.UGMinCGPA, input.PGMinCGPA, input.UseAggregate, input.AggregatePercentage,
		input.MaxBacklogsAllowed, input.EligibleGender, id,
	)
	if err != nil {
		return err
	}

	_, err = r.DB.Exec(ctx, "DELETE FROM eligibility_template_batches WHERE template_id=$1", id)
	if err == nil && len(input.EligibleBatches) > 0 {
		batchQuery := `INSERT INTO eligibility_template_batches (template_id, batch_year) VALUES ($1, $2)`
		for _, batch := range input.EligibleBatches {
			r.DB.Exec(ctx, batchQuery, id, batch)
		}
	}

	_, err = r.DB.Exec(ctx, "DELETE FROM eligibility_template_departments WHERE template_id=$1", id)
	if err == nil && len(input.EligibleDepartments) > 0 {
		deptQuery := `INSERT INTO eligibility_template_departments (template_id, department_code) VALUES ($1, $2)`
		for _, dept := range input.EligibleDepartments {
			r.DB.Exec(ctx, deptQuery, id, dept)
		}
	}
	return nil
}

func (r *EligibilityRepository) DeleteTemplate(ctx context.Context, id int64) error {
	query := `DELETE FROM eligibility_templates WHERE id=$1`
	_, err := r.DB.Exec(ctx, query, id)
	return err
}

func (r *EligibilityRepository) GetTemplateByID(ctx context.Context, id int64) (*models.EligibilityTemplate, error) {
	query := `
		SELECT 
			id, name, min_cgpa, tenth_percentage, twelfth_percentage,
			ug_min_cgpa, pg_min_cgpa, use_aggregate, aggregate_percentage,
			max_backlogs_allowed, 
            COALESCE((SELECT jsonb_agg(etd.department_code) FROM eligibility_template_departments etd WHERE etd.template_id = eligibility_templates.id), '[]'::jsonb),
            COALESCE((SELECT jsonb_agg(etb.batch_year) FROM eligibility_template_batches etb WHERE etb.template_id = eligibility_templates.id), '[]'::jsonb),
			eligible_gender, created_by, created_at, updated_at
		FROM eligibility_templates
		WHERE id=$1
	`
	var t models.EligibilityTemplate
	err := r.DB.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.Name, &t.MinCgpa, &t.TenthPercentage, &t.TwelfthPercentage,
		&t.UGMinCGPA, &t.PGMinCGPA, &t.UseAggregate, &t.AggregatePercentage,
		&t.MaxBacklogsAllowed, &t.EligibleDepartments, &t.EligibleBatches,
		&t.EligibleGender, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
