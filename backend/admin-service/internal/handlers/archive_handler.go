package handlers

import (
	"archive/zip"
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"time"

	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// ArchivePlacementRecords creates a ZIP archive of placement records
// @Summary Archive Placements
// @Description Download placement records (drives, applications, students) as ZIP for specified period
// @Tags Admin
// @Param period query string true "Period: week, month, year" Enums(week, month, year)
// @Produce application/zip
// @Security BearerAuth
// @Success 200 {file} application/zip
// @Failure 400 {string} string "Invalid period"
// @Failure 500 {string} string "Server error"
// @Router /v1/admin/archive/placements [get]
func ArchivePlacementRecords(c *fiber.Ctx) error {
	period := c.Query("period", "month")

	// Calculate date range
	var startDate time.Time
	now := time.Now()

	switch period {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	case "year":
		startDate = now.AddDate(-1, 0, 0)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid period. Use: week, month, or year"})
	}

	// Create temporary ZIP file
	zipPath := fmt.Sprintf("/tmp/placements_%s_%s.zip", period, now.Format("2006-01-02"))
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create archive file"})
	}
	defer func() {
		zipFile.Close()
		os.Remove(zipPath)
	}()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	ctx := context.Background()
	driveRepo := repository.NewDriveRepository(database.DB)

	// 1. Fetch drives in date range
	drives, err := fetchDrivesInRange(ctx, driveRepo, startDate, now)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch drives"})
	}

	// 2. Generate and add drives CSV
	if err := addDrivesCSV(zipWriter, drives); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate drives CSV"})
	}

	// 3. Fetch and add applications
	if len(drives) > 0 {
		if err := addApplicationsCSV(ctx, zipWriter, driveRepo, drives); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate applications CSV"})
		}
	}

	// Close the ZIP writer before sending
	zipWriter.Close()
	zipFile.Close()

	// Send the file
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=placements_%s.zip", period))
	return c.SendFile(zipPath)
}

// fetchDrivesInRange fetches drives created within a date range
func fetchDrivesInRange(ctx context.Context, repo *repository.DriveRepository, start, end time.Time) ([]driveRecord, error) {
	query := `
        SELECT 
            id, company_name, drive_type, company_category,
            location, min_cgpa, drive_date, deadline_date, 
            status, created_at
        FROM placement_drives
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
    `

	rows, err := repo.DB.Query(ctx, query, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drives []driveRecord
	for rows.Next() {
		var d driveRecord
		var driveDate, deadlineDate, createdAt *time.Time

		err := rows.Scan(
			&d.ID, &d.CompanyName, &d.DriveType, &d.Category,
			&d.Location, &d.MinCGPA, &driveDate, &deadlineDate,
			&d.Status, &createdAt,
		)
		if err != nil {
			continue
		}

		if driveDate != nil {
			d.DriveDate = driveDate.Format("2006-01-02")
		}
		if deadlineDate != nil {
			d.DeadlineDate = deadlineDate.Format("2006-01-02")
		}
		if createdAt != nil {
			d.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		}

		drives = append(drives, d)
	}

	return drives, nil
}

// addDrivesCSV writes drives data to CSV in ZIP
func addDrivesCSV(zipWriter *zip.Writer, drives []driveRecord) error {
	csvFile, err := zipWriter.Create("drives.csv")
	if err != nil {
		return err
	}

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write header
	header := []string{"ID", "Company", "Drive Type", "Category", "Location", "Min CGPA", "Drive Date", "Deadline", "Status", "Created At"}
	if err := writer.Write(header); err != nil {
		return err
	}

	// Write data rows
	for _, d := range drives {
		row := []string{
			fmt.Sprintf("%d", d.ID),
			d.CompanyName,
			d.DriveType,
			d.Category,
			d.Location,
			fmt.Sprintf("%.2f", d.MinCGPA),
			d.DriveDate,
			d.DeadlineDate,
			d.Status,
			d.CreatedAt,
		}
		if err := writer.Write(row); err != nil {
			return err
		}
	}

	return nil
}

// addApplicationsCSV fetches and writes applications data
func addApplicationsCSV(ctx context.Context, zipWriter *zip.Writer, repo *repository.DriveRepository, drives []driveRecord) error {
	csvFile, err := zipWriter.Create("applications.csv")
	if err != nil {
		return err
	}

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write header
	header := []string{"Drive ID", "Company", "Student Email", "Student Name", "Register No", "Department", "Status", "Applied At"}
	if err := writer.Write(header); err != nil {
		return err
	}

	// Fetch applications for each drive
	for _, drive := range drives {
		query := `
            SELECT 
                u.email, u.name, sp.register_number, sp.department,
                da.status, da.applied_at
            FROM drive_applications da
            JOIN users u ON da.student_id = u.id
            JOIN student_personal sp ON u.id = sp.user_id
            WHERE da.drive_id = $1
            ORDER BY da.applied_at DESC
        `

		rows, err := repo.DB.Query(ctx, query, drive.ID)
		if err != nil {
			continue
		}

		for rows.Next() {
			var email, name, regNo, dept, status string
			var appliedAt *time.Time

			if err := rows.Scan(&email, &name, &regNo, &dept, &status, &appliedAt); err != nil {
				continue
			}

			appliedStr := ""
			if appliedAt != nil {
				appliedStr = appliedAt.Format("2006-01-02 15:04:05")
			}

			row := []string{
				fmt.Sprintf("%d", drive.ID),
				drive.CompanyName,
				email,
				name,
				regNo,
				dept,
				status,
				appliedStr,
			}
			if err := writer.Write(row); err != nil {
				rows.Close()
				return err
			}
		}
		rows.Close()
	}

	return nil
}

// driveRecord represents a drive for CSV export
type driveRecord struct {
	ID           int64
	CompanyName  string
	DriveType    string
	Category     string
	Location     string
	MinCGPA      float64
	DriveDate    string
	DeadlineDate string
	Status       string
	CreatedAt    string
}
