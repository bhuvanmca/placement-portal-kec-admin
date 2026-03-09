package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/placement-portal-kec/analytics-service/internal/models"
)

type AnalyticsRepository struct {
	DB *pgxpool.Pool
}

func NewAnalyticsRepository(db *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{DB: db}
}

func (r *AnalyticsRepository) GetDashboardAnalytics(ctx context.Context, timeframe string) (*models.DashboardAnalytics, error) {
	analytics := &models.DashboardAnalytics{
		YearWise:       []models.YearWiseAnalytics{},
		DepartmentWise: []models.DepartmentWiseAnalytics{},
		GenderWise:     []models.GenderWiseAnalytics{},
		CategoryWise:   []models.CategoryWiseAnalytics{},
		OfferTypeWise:  []models.OfferTypeAnalytics{},
		SalaryWise:     []models.SalaryBracketAnalytics{},
		TopRecruiters:  []models.TopRecruitersAnalytics{},
	}

	timeFilter := ""
	switch timeframe {
	case "weekly":
		timeFilter = "AND da.updated_at >= NOW() - INTERVAL '7 days'"
	case "monthly":
		timeFilter = "AND da.updated_at >= NOW() - INTERVAL '30 days'"
	case "quarterly":
		timeFilter = "AND da.updated_at >= NOW() - INTERVAL '3 months'"
	case "half_yearly":
		timeFilter = "AND da.updated_at >= NOW() - INTERVAL '6 months'"
	case "annual":
		timeFilter = "AND da.updated_at >= NOW() - INTERVAL '1 year'"
	}

	// 1. Year-wise analytics
	yearQuery := fmt.Sprintf(`
		SELECT 
			sp.batch_year,
			COUNT(DISTINCT sp.user_id) as total_students,
			COUNT(DISTINCT CASE WHEN sp.placement_willingness = 'Interested' THEN sp.user_id END) as interested_students,
			COUNT(DISTINCT CASE WHEN da.status = 'placed' %s THEN sp.user_id END) as placed_students,
			COUNT(CASE WHEN da.status = 'placed' %s THEN 1 END) as total_offers
		FROM student_personal sp
		LEFT JOIN drive_applications da ON sp.user_id = da.student_id
		WHERE sp.batch_year IS NOT NULL AND sp.batch_year > 0
		GROUP BY sp.batch_year
		ORDER BY sp.batch_year DESC
	`, timeFilter, timeFilter)
	rows, err := r.DB.Query(ctx, yearQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch year-wise analytics: %v", err)
	}
	for rows.Next() {
		var a models.YearWiseAnalytics
		if err := rows.Scan(&a.BatchYear, &a.TotalStudents, &a.InterestedStudents, &a.PlacedStudents, &a.TotalOffers); err != nil {
			rows.Close()
			return nil, err
		}
		if a.InterestedStudents > 0 {
			a.PlacementPercentage = float64(a.PlacedStudents) / float64(a.InterestedStudents) * 100
		}
		analytics.YearWise = append(analytics.YearWise, a)
	}
	rows.Close()

	// 2. Department-wise analytics
	deptQuery := fmt.Sprintf(`
		SELECT 
			sp.department,
			COUNT(DISTINCT sp.user_id) as total_students,
			COUNT(DISTINCT CASE WHEN sp.placement_willingness = 'Interested' THEN sp.user_id END) as interested_students,
			COUNT(DISTINCT CASE WHEN da.status = 'placed' %s THEN sp.user_id END) as placed_students
		FROM student_personal sp
		LEFT JOIN drive_applications da ON sp.user_id = da.student_id
		WHERE sp.department IS NOT NULL
		GROUP BY sp.department
		ORDER BY sp.department
	`, timeFilter)
	rows, err = r.DB.Query(ctx, deptQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch department-wise analytics: %v", err)
	}
	for rows.Next() {
		var a models.DepartmentWiseAnalytics
		if err := rows.Scan(&a.DepartmentCode, &a.TotalStudents, &a.InterestedStudents, &a.PlacedStudents); err != nil {
			rows.Close()
			return nil, err
		}
		if a.InterestedStudents > 0 {
			a.PlacementPercentage = float64(a.PlacedStudents) / float64(a.InterestedStudents) * 100
		}
		analytics.DepartmentWise = append(analytics.DepartmentWise, a)
	}
	rows.Close()

	// 3. Gender-wise analytics (Placed Students)
	genderQuery := fmt.Sprintf(`
		SELECT 
			COALESCE(sp.gender, 'Unspecified') as gender,
			COUNT(DISTINCT sp.user_id) as placed_students
		FROM student_personal sp
		JOIN drive_applications da ON sp.user_id = da.student_id
		WHERE da.status = 'placed' %s
		GROUP BY COALESCE(sp.gender, 'Unspecified')
	`, timeFilter)
	rows, err = r.DB.Query(ctx, genderQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gender-wise analytics: %v", err)
	}
	for rows.Next() {
		var a models.GenderWiseAnalytics
		if err := rows.Scan(&a.Gender, &a.PlacedStudents); err != nil {
			rows.Close()
			return nil, err
		}
		analytics.GenderWise = append(analytics.GenderWise, a)
	}
	rows.Close()

	// 4. Category-wise analytics (Offers by Company Category)
	categoryQuery := fmt.Sprintf(`
		SELECT 
			pd.company_category,
			COUNT(da.student_id) as placed_students
		FROM placement_drives pd
		JOIN drive_applications da ON pd.id = da.drive_id
		WHERE da.status = 'placed' AND pd.company_category IS NOT NULL %s
		GROUP BY pd.company_category
	`, timeFilter)
	rows, err = r.DB.Query(ctx, categoryQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch category-wise analytics: %v", err)
	}
	for rows.Next() {
		var a models.CategoryWiseAnalytics
		if err := rows.Scan(&a.Category, &a.PlacedStudents); err != nil {
			rows.Close()
			return nil, err
		}
		analytics.CategoryWise = append(analytics.CategoryWise, a)
	}
	rows.Close()

	// 5. Offer Type analytics (Dream vs Regular)
	offerTypeQuery := fmt.Sprintf(`
		SELECT 
			pd.offer_type,
			COUNT(da.student_id) as placed_students
		FROM placement_drives pd
		JOIN drive_applications da ON pd.id = da.drive_id
		WHERE da.status = 'placed' AND pd.offer_type IS NOT NULL %s
		GROUP BY pd.offer_type
	`, timeFilter)
	rows, err = r.DB.Query(ctx, offerTypeQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch offer-type analytics: %v", err)
	}
	for rows.Next() {
		var a models.OfferTypeAnalytics
		if err := rows.Scan(&a.OfferType, &a.PlacedStudents); err != nil {
			rows.Close()
			return nil, err
		}
		analytics.OfferTypeWise = append(analytics.OfferTypeWise, a)
	}
	rows.Close()

	// 6. Salary Bracket Analytics
	salaryQuery := fmt.Sprintf(`
		WITH salary_data AS (
			SELECT 
				CASE 
					WHEN da.package_offered < 500000 THEN '< 5 LPA'
					WHEN da.package_offered >= 500000 AND da.package_offered < 1000000 THEN '5-10 LPA'
					WHEN da.package_offered >= 1000000 AND da.package_offered < 2000000 THEN '10-20 LPA'
					ELSE '20+ LPA'
				END as bracket,
				da.student_id
			FROM drive_applications da
			WHERE da.status = 'placed' AND da.package_offered IS NOT NULL AND da.package_offered > 0 %s
		)
		SELECT bracket, COUNT(student_id) as placed_students
		FROM salary_data
		GROUP BY bracket
		ORDER BY 
			CASE bracket
				WHEN '< 5 LPA' THEN 1
				WHEN '5-10 LPA' THEN 2
				WHEN '10-20 LPA' THEN 3
				ELSE 4
			END
	`, timeFilter)
	rows, err = r.DB.Query(ctx, salaryQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch salary bracket analytics: %v", err)
	}
	for rows.Next() {
		var a models.SalaryBracketAnalytics
		if err := rows.Scan(&a.Bracket, &a.PlacedStudents); err != nil {
			rows.Close()
			return nil, err
		}
		analytics.SalaryWise = append(analytics.SalaryWise, a)
	}
	rows.Close()

	// 7. Top Recruiters by offer volume
	recruitersQuery := fmt.Sprintf(`
		SELECT 
			pd.company_name,
			COUNT(da.student_id) as placed_students
		FROM placement_drives pd
		JOIN drive_applications da ON pd.id = da.drive_id
		WHERE da.status = 'placed' %s
		GROUP BY pd.company_name
		ORDER BY placed_students DESC
		LIMIT 5
	`, timeFilter)
	rows, err = r.DB.Query(ctx, recruitersQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch top recruiters analytics: %v", err)
	}
	for rows.Next() {
		var a models.TopRecruitersAnalytics
		if err := rows.Scan(&a.CompanyName, &a.PlacedStudents); err != nil {
			rows.Close()
			return nil, err
		}
		analytics.TopRecruiters = append(analytics.TopRecruiters, a)
	}
	rows.Close()

	return analytics, nil
}
