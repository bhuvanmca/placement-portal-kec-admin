-- ==========================================
-- ADMIN SERVICE — Schema Definition
-- Schema: admin (search_path: admin, student, drive, public)
--
-- Owns: spocs, system_settings, broadcast_templates,
--       eligibility_templates, role_permissions, activity_logs
-- Reads: users, departments, batches (public)
--        student_personal, etc. (student)
--        placement_drives, etc. (drive)
-- ==========================================

CREATE SCHEMA IF NOT EXISTS admin;
SET search_path TO admin, public;

-- SPOCs (Single Points of Contact)
CREATE TABLE IF NOT EXISTS spocs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings (Key-Value Store)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by BIGINT REFERENCES users(id)
);

-- Broadcast Templates
CREATE TABLE IF NOT EXISTS broadcast_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('WHATSAPP', 'EMAIL')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eligibility Templates
CREATE TABLE IF NOT EXISTS eligibility_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    min_cgpa DECIMAL(4,2) DEFAULT 0.0,
    tenth_percentage DECIMAL(5,2),
    twelfth_percentage DECIMAL(5,2),
    ug_min_cgpa DECIMAL(4,2),
    pg_min_cgpa DECIMAL(4,2),
    use_aggregate BOOLEAN DEFAULT FALSE,
    aggregate_percentage DECIMAL(5,2),
    max_backlogs_allowed INT DEFAULT 0,
    eligible_gender VARCHAR(10) DEFAULT 'All',
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eligibility Template ↔ Departments
CREATE TABLE IF NOT EXISTS eligibility_template_departments (
    template_id BIGINT REFERENCES eligibility_templates(id) ON DELETE CASCADE,
    department_code VARCHAR(20) REFERENCES departments(code) ON DELETE CASCADE,
    PRIMARY KEY (template_id, department_code)
);

-- Eligibility Template ↔ Batches
CREATE TABLE IF NOT EXISTS eligibility_template_batches (
    template_id BIGINT REFERENCES eligibility_templates(id) ON DELETE CASCADE,
    batch_year INT REFERENCES batches(year) ON DELETE CASCADE,
    PRIMARY KEY (template_id, batch_year)
);

-- Role-Based Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(50) NOT NULL,
    is_granted BOOLEAN DEFAULT TRUE,
    granted_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_permission UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_user ON role_permissions(user_id);

-- Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ==========================================
-- SEED DATA
-- ==========================================

-- System Settings
INSERT INTO system_settings (key, value) VALUES
    ('college_name', 'Kongu Engineering College'),
    ('college_logo_url', ''),
    ('placement_policy', ''),
    ('academic_year', '2025-2026')
ON CONFLICT (key) DO NOTHING;

-- SPOC
INSERT INTO spocs (name, designation, mobile_number, email)
SELECT 'Dakshanamoorthy', 'Placement Head', '9876543210', 'dakshanamoorthy@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM spocs WHERE email = 'dakshanamoorthy@gmail.com');

-- Admin Permissions (user_id=2 dakshanamoorthy, user_id=3 kavin)
INSERT INTO role_permissions (user_id, permission_key, is_granted) VALUES
(2, 'manage_drives', TRUE), (2, 'manage_students', TRUE),
(2, 'approve_changes', TRUE), (2, 'manage_spocs', TRUE),
(2, 'manage_storage', TRUE), (2, 'export_data', TRUE),
(2, 'manual_drive_ops', TRUE), (2, 'view_analytics', TRUE),
(3, 'manage_drives', TRUE), (3, 'manage_students', TRUE),
(3, 'approve_changes', TRUE), (3, 'manage_spocs', TRUE),
(3, 'manage_storage', TRUE), (3, 'export_data', TRUE),
(3, 'manual_drive_ops', TRUE), (3, 'view_analytics', TRUE)
ON CONFLICT (user_id, permission_key) DO NOTHING;

-- Coordinator Permissions (user_id=4 rahunathan)
INSERT INTO role_permissions (user_id, permission_key, is_granted) VALUES
(4, 'manage_drives', TRUE), (4, 'manage_students', TRUE),
(4, 'approve_changes', TRUE), (4, 'manual_drive_ops', TRUE),
(4, 'view_analytics', TRUE)
ON CONFLICT (user_id, permission_key) DO NOTHING;
