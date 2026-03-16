-- Add missing opt_out_reason and status_change_count columns to drive_applications
-- opt_out_reason is referenced in queries (GetEligibleDrives, GetApplicants)
-- but was never created in the initial migration.
-- status_change_count tracks how many times a student toggles opt-in/opt-out (limit: 3).

SET search_path
TO drive, public;

ALTER TABLE drive_applications
    ADD COLUMN
IF NOT EXISTS opt_out_reason TEXT DEFAULT '';

ALTER TABLE drive_applications
    ADD COLUMN
IF NOT EXISTS status_change_count INT DEFAULT 0;
