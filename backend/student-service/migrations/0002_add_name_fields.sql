-- ==========================================
-- Migration: Add name and family fields to student_personal
-- ==========================================

SET search_path TO student, public;

ALTER TABLE student_personal ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE student_personal ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE student_personal ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE student_personal ADD COLUMN IF NOT EXISTS father_name VARCHAR(100);
ALTER TABLE student_personal ADD COLUMN IF NOT EXISTS mother_name VARCHAR(100);
