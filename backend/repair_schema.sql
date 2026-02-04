-- ==========================================
-- REPAIR SCHEMA SCRIPT
-- Run this in pgAdmin 4 or psql to fix the "column does not exist" errors
-- ==========================================

-- 1. Add missing Board/Institution details to student_academics
ALTER TABLE student_academics
ADD COLUMN IF NOT EXISTS tenth_board VARCHAR(100),
ADD COLUMN IF NOT EXISTS tenth_year_pass INT,
ADD COLUMN IF NOT EXISTS tenth_institution VARCHAR(150),

ADD COLUMN IF NOT EXISTS twelfth_board VARCHAR(100),
ADD COLUMN IF NOT EXISTS twelfth_year_pass INT,
ADD COLUMN IF NOT EXISTS twelfth_institution VARCHAR(150),

ADD COLUMN IF NOT EXISTS diploma_year_pass INT,
ADD COLUMN IF NOT EXISTS diploma_institution VARCHAR(150);

-- 2. Add Semester GPAs (UG)
ALTER TABLE student_academics
ADD COLUMN IF NOT EXISTS ug_gpa_s1 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s2 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s3 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s4 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s5 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s6 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s7 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s8 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s9 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ug_gpa_s10 DECIMAL(4,2) DEFAULT 0.0;

-- 3. Add Semester GPAs (PG)
ALTER TABLE student_academics
ADD COLUMN IF NOT EXISTS pg_gpa_s1 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s2 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s3 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s4 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s5 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s6 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s7 DECIMAL(4,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS pg_gpa_s8 DECIMAL(4,2) DEFAULT 0.0;

-- 4. Verify existing JSONB columns in student_personal (just in case)
-- Use DO block to add if missing (Postgres doesn't support ADD COLUMN IF NOT EXISTS for some versions in the same way, but standard syntax should work on recent PG)
ALTER TABLE student_personal
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS language_skills JSONB DEFAULT '[]';
