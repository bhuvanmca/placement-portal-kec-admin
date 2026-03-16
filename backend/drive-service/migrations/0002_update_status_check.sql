-- Update status CHECK constraint to support all statuses used in the application
SET search_path
TO drive, public;

ALTER TABLE placement_drives DROP CONSTRAINT IF EXISTS placement_drives_status_check;
ALTER TABLE placement_drives ADD CONSTRAINT placement_drives_status_check 
    CHECK (status IN ('open', 'closed', 'draft', 'completed', 'cancelled'));
