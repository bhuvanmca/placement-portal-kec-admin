-- Add missing opt_out_reason column to drive_applications
-- This column is referenced in queries (GetEligibleDrives, GetApplicants)
-- but was never created in the initial migration.

SET search_path
TO drive, public;

ALTER TABLE drive_applications
    ADD COLUMN
IF NOT EXISTS opt_out_reason TEXT DEFAULT '';
