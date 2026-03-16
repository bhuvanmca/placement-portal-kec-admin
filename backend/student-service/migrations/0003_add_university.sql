-- Add university name columns for diploma, UG, and PG
SET search_path TO student, public;

ALTER TABLE student_schooling ADD COLUMN IF NOT EXISTS diploma_university VARCHAR(255);
ALTER TABLE student_degrees ADD COLUMN IF NOT EXISTS university VARCHAR(255);
