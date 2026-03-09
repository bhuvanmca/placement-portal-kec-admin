package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepository struct {
	DB *pgxpool.Pool
}

func NewSettingsRepository(db *pgxpool.Pool) *SettingsRepository {
	return &SettingsRepository{DB: db}
}

// GetSystemSettings retrieves all system settings as a map
func (r *SettingsRepository) GetSystemSettings(ctx context.Context) (map[string]string, error) {
	query := `SELECT key, value FROM system_settings`
	rows, err := r.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		settings[key] = value
	}
	return settings, nil
}

// UpdateSystemSetting updates or inserts a system setting
func (r *SettingsRepository) UpdateSystemSetting(ctx context.Context, key string, value string, updatedBy int64) error {
	query := `
		INSERT INTO system_settings (key, value, updated_by, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (key) DO UPDATE 
		SET value = EXCLUDED.value, 
		    updated_by = EXCLUDED.updated_by, 
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.DB.Exec(ctx, query, key, value, updatedBy)
	return err
}
