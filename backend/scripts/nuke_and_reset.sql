-- ==========================================
-- ☢️ MASTER NUKE & RESET SCRIPT ☢️
-- Run this in pgAdmin to wipe everything
-- ==========================================

-- 1. Drop Schema-specific Tables & Schemas
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS student CASCADE;
DROP SCHEMA IF EXISTS drive CASCADE;
DROP SCHEMA IF EXISTS admin CASCADE;
DROP SCHEMA IF EXISTS chat CASCADE;
DROP SCHEMA IF EXISTS analytics CASCADE;

-- 2. Clean up shared tables in public schema
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;

-- 3. Reset the migration history so the automation runs everything again
DROP TABLE IF EXISTS public.migrations_history CASCADE;

-- 4. Re-setup high-level structure (empty)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS student;
CREATE SCHEMA IF NOT EXISTS drive;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS analytics;

RAISE NOTICE 'Database Nuked. Automated migrations will now re-run from scratch on next deployment.';
