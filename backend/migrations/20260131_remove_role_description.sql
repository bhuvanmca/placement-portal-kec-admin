-- Migration: Remove description field from job_roles table
-- Date: 2026-01-31
-- Reason: Align with frontend changes - description is no longer used

ALTER TABLE job_roles DROP COLUMN IF EXISTS description;
