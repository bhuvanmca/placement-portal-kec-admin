-- ==========================================
-- AUTH SERVICE — Schema Definition
-- Schema: auth (search_path: auth, public)
--
-- Owns: password_resets
-- Reads: users, departments, batches (public)
-- ==========================================

CREATE SCHEMA IF NOT EXISTS auth;
SET search_path TO auth, public;

-- Password Reset OTPs
CREATE TABLE IF NOT EXISTS password_resets (
    email VARCHAR(255) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ==========================================
-- SHARED TABLES (public schema)
-- These are created by auth-service since it
-- runs first and all services depend on them.
-- ==========================================
SET search_path TO public;

-- Users (shared identity store)
CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Departments (shared master data)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'UG' CHECK (type IN ('UG', 'PG', 'PhD')),
    is_active BOOLEAN DEFAULT TRUE
);

-- Batches (shared master data)
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    year INT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- SEED DATA
-- ==========================================

-- Departments
INSERT INTO departments (name, code, type, is_active) VALUES
('Computer Science and Engineering', 'CSE', 'UG', TRUE),
('Information Technology', 'IT', 'UG', TRUE),
('Electronics and Communication Engineering', 'ECE', 'UG', TRUE),
('Electrical and Electronics Engineering', 'EEE', 'UG', TRUE),
('Mechanical Engineering', 'MECH', 'UG', TRUE),
('Civil Engineering', 'CIVIL', 'UG', TRUE),
('Artificial Intelligence and Data Science', 'AI&DS', 'UG', TRUE),
('Computer Science and Business Systems', 'CSBS', 'UG', TRUE),
('Mechatronics Engineering', 'MCT', 'UG', TRUE),
('Master of Business Administration', 'MBA', 'PG', TRUE),
('Master of Computer Applications', 'MCA', 'PG', TRUE),
('M.E. CSE', 'M.E CSE', 'PG', TRUE),
('M.Tech IT', 'M.Tech IT', 'PG', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Batches
INSERT INTO batches (year, is_active) VALUES
(2024, TRUE), (2025, TRUE), (2026, TRUE), (2027, TRUE)
ON CONFLICT (year) DO NOTHING;

-- Super Admin (password: qwerty)
INSERT INTO users (email, password_hash, role, name, is_active)
VALUES ('admin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'super_admin', 'Super Admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Admins (password: qwerty)
INSERT INTO users (email, password_hash, role, name, is_active)
VALUES ('dakshanamoorthy@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'admin', 'Dakshanamoorthy', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, role, name, is_active)
VALUES ('kavin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'admin', 'Kavin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Coordinator (password: qwerty)
INSERT INTO users (email, password_hash, role, name, department_code, is_active)
VALUES ('rahunathan@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'coordinator', 'Rahunathan', 'MCA', TRUE)
ON CONFLICT (email) DO NOTHING;
