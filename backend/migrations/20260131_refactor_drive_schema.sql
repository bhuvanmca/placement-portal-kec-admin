-- Migration: Refactor Drive Schema
-- Date: 2026-01-31
-- Description: Remove redundant fields from placement_drives and add salary to job_roles for filtering.

-- 1. Add salary column to job_roles for numeric filtering
ALTER TABLE job_roles ADD COLUMN IF NOT EXISTS salary BIGINT DEFAULT 0;

-- 2. Add location column to placement_drives (Moved from job_roles)
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) DEFAULT 'On-Site';
ALTER TABLE placement_drives ADD CONSTRAINT placement_drives_location_type_check CHECK (location_type IN ('On-Site', 'Hybrid', 'Remote'));

-- 3. Remove location from job_roles
ALTER TABLE job_roles DROP COLUMN IF EXISTS location;

-- 4. Drop redundant columns from placement_drives
ALTER TABLE placement_drives 
DROP COLUMN IF EXISTS job_role,
DROP COLUMN IF EXISTS ctc_min,
DROP COLUMN IF EXISTS ctc_max,
DROP COLUMN IF EXISTS ctc_display,
DROP COLUMN IF EXISTS stipend_min,
DROP COLUMN IF EXISTS stipend_max;
