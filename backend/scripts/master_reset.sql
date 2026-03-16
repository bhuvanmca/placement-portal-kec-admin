-- ==========================================
-- MASTER RESET & FRESH INSTALL
-- Combined schema for all microservices
-- ==========================================

-- 1. CLEANUP (Drop everything if exists)
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS student CASCADE;
DROP SCHEMA IF EXISTS drive CASCADE;
DROP SCHEMA IF EXISTS admin CASCADE;
DROP SCHEMA IF EXISTS chat CASCADE;
DROP SCHEMA IF EXISTS analytics CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. SHARED CORE (Public)
CREATE TABLE public.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'UG' CHECK (type IN ('UG', 'PG', 'PhD')),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE public.batches (
    id SERIAL PRIMARY KEY,
    year INT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'super_admin', 'coordinator')),
    name VARCHAR(150),
    department_code VARCHAR(20),
    profile_photo_url TEXT,
    fcm_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SEED CORE DATA
INSERT INTO public.departments (name, code, type) VALUES
('Computer Science and Engineering', 'CSE', 'UG'),
('Information Technology', 'IT', 'UG');

INSERT INTO public.batches (year) VALUES (2024), (2025), (2026), (2027);

-- Password: qwerty
INSERT INTO public.users (email, password_hash, role, name)
VALUES ('admin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'super_admin', 'Super Admin');

-- 4. SERVICE SCHEMAS (Placeholders - Full definitions are in migrations/)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS student;
CREATE SCHEMA IF NOT EXISTS drive;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS analytics;

-- ==========================================
-- NOTE: For the full detailed tables of each service, 
-- please refer to the versioned scripts in:
-- backend/<service-name>/migrations/
-- ==========================================
