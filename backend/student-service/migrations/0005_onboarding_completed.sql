-- Add onboarding_completed flag to student_personal.
-- FALSE by default so existing students who created accounts via admin
-- but haven't finished onboarding will still get the first-time pass-through.
-- Set to TRUE after the student completes profile setup (all key fields populated).

ALTER TABLE student_personal
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark existing students who already have academic data filled as onboarded,
-- so they aren't exempted from future permission checks.
UPDATE student_personal sp
SET onboarding_completed = TRUE
FROM student_schooling ss
WHERE ss.user_id = sp.user_id
  AND (ss.tenth_mark > 0 OR ss.twelfth_mark > 0);
