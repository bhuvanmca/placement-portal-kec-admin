-- ==========================================
-- STUDENT SERVICE — Schema Definition
-- Schema: student (search_path: student, public)
--
-- Owns: student_personal, student_schooling,
--       student_degrees, student_documents,
--       student_change_requests, field_permissions
-- Reads: users, departments, batches (public)
-- ==========================================

CREATE SCHEMA IF NOT EXISTS student;
SET search_path TO student, public;

-- Student Personal Information
CREATE TABLE IF NOT EXISTS student_personal (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    register_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(20) REFERENCES departments(code),
    batch_year INTEGER NOT NULL,
    student_type VARCHAR(20) DEFAULT 'Regular',
    placement_willingness VARCHAR(50) DEFAULT 'Interested',
    gender VARCHAR(10),
    dob DATE,
    mobile_number VARCHAR(15),
    address_line_1 TEXT,
    address_line_2 TEXT,
    state VARCHAR(50),
    pan_number VARCHAR(20),
    aadhar_number VARCHAR(20),
    social_links JSONB DEFAULT '{}',
    language_skills JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Schooling History
CREATE TABLE IF NOT EXISTS student_schooling (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tenth_mark NUMERIC(5,2) DEFAULT 0,
    tenth_board VARCHAR(100),
    tenth_year_pass INTEGER DEFAULT 0,
    tenth_institution VARCHAR(255),
    twelfth_mark NUMERIC(5,2) DEFAULT 0,
    twelfth_board VARCHAR(100),
    twelfth_year_pass INTEGER DEFAULT 0,
    twelfth_institution VARCHAR(255),
    diploma_mark NUMERIC(5,2) DEFAULT 0,
    diploma_year_pass INTEGER DEFAULT 0,
    diploma_institution VARCHAR(255),
    current_backlogs INTEGER DEFAULT 0,
    history_of_backlogs INTEGER DEFAULT 0,
    gap_years INTEGER DEFAULT 0,
    gap_reason TEXT
);

-- Student Degree Records
CREATE TABLE IF NOT EXISTS student_degrees (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    degree_level VARCHAR(10) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    degree_name VARCHAR(100),
    specialisation VARCHAR(100),
    institution VARCHAR(255),
    year_pass INTEGER DEFAULT 0,
    cgpa NUMERIC(4,2) DEFAULT 0,
    semester_gpas JSONB DEFAULT '{}',
    UNIQUE(user_id, degree_level)
);

-- Student Documents
CREATE TABLE IF NOT EXISTS student_documents (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    resume_url TEXT,
    resume_updated_at TIMESTAMPTZ,
    aadhar_card_url TEXT,
    aadhar_card_updated_at TIMESTAMPTZ,
    pan_card_url TEXT,
    pan_card_updated_at TIMESTAMPTZ
);

-- Student Change Requests (Edit Approval Flow)
CREATE TABLE IF NOT EXISTS student_change_requests (
    id SERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_comment TEXT,
    handled_by BIGINT REFERENCES users(id),
    handled_at TIMESTAMPTZ,
    is_deleted_by_student BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field Permissions (Admin-controlled student edit toggles)
CREATE TABLE IF NOT EXISTS field_permissions (
    field_name VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100),
    is_enabled BOOLEAN DEFAULT TRUE,
    category VARCHAR(50)
);

-- ==========================================
-- SEED DATA
-- ==========================================

INSERT INTO field_permissions (field_name, label, is_enabled, category) VALUES
    ('mobile_number', 'Mobile Number', TRUE, 'Personal'),
    ('dob', 'Date of Birth', FALSE, 'Personal'),
    ('gender', 'Gender', FALSE, 'Personal'),
    ('address', 'Address', TRUE, 'Personal'),
    ('tenth_mark', '10th Mark', FALSE, 'Academics'),
    ('twelfth_mark', '12th Mark', FALSE, 'Academics'),
    ('ug_cgpa', 'UG CGPA', FALSE, 'Academics'),
    ('pg_cgpa', 'PG CGPA', FALSE, 'Academics'),
    ('placement_willingness', 'Placement Willingness', TRUE, 'Placement')
ON CONFLICT (field_name) DO NOTHING;
