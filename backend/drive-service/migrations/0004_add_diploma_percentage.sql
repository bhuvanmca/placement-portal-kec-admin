-- Add diploma_percentage eligibility column to placement_drives
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS diploma_percentage DECIMAL(5,2);
