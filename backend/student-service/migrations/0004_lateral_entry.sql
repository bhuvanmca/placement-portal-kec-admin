-- ==========================================
-- Migration: Support lateral entry students
-- Adds diploma_board to student_schooling
-- Validates student_type values
-- ==========================================

SET search_path TO student, public;

-- Add diploma_board for consistency with 10th/12th board fields
ALTER TABLE student_personal ADD COLUMN IF NOT EXISTS diploma_board VARCHAR(100);
ALTER TABLE student_schooling ADD COLUMN IF NOT EXISTS diploma_board VARCHAR(100);

-- Add CHECK constraint for student_type values
-- Regular: 10th + 12th → UG (sem 1-8)
-- Lateral_12th: 10th + 12th + Diploma → UG (sem 3-8)
-- Lateral_Diploma: 10th + Diploma (no 12th) → UG (sem 3-8)
DO $$
BEGIN
    -- Update any existing non-standard values to 'Regular'
    UPDATE student_personal
    SET student_type = 'Regular'
    WHERE student_type NOT IN ('Regular', 'Lateral_12th', 'Lateral_Diploma');

    -- Add constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_student_type'
    ) THEN
        ALTER TABLE student_personal
        ADD CONSTRAINT chk_student_type
        CHECK (student_type IN ('Regular', 'Lateral_12th', 'Lateral_Diploma'));
    END IF;
END $$;
