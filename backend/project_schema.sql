-- ==========================================
-- PLACEMENT MANAGEMENT SYSTEM - FINAL NORMALIZED SCHEMA (V3.1)
-- Optimized for GoFiber Backend & Flutter App
-- Verified: Includes Chat Features (is_pinned, deleted_for) and Storage Access
-- Normalization Level: 3.5NF
-- ==========================================

-- ==========================================
-- 1. CLEANUP
-- ==========================================
DROP VIEW IF EXISTS view_student_details CASCADE;
DROP FUNCTION IF EXISTS apply_for_drive(BIGINT, BIGINT);
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS drive_application_roles CASCADE;
DROP TABLE IF EXISTS drive_applications CASCADE;
DROP TABLE IF EXISTS drive_eligible_departments CASCADE;
DROP TABLE IF EXISTS drive_eligible_batches CASCADE;
DROP TABLE IF EXISTS job_roles CASCADE;
DROP TABLE IF EXISTS placement_drives CASCADE;
DROP TABLE IF EXISTS spocs CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS student_documents CASCADE;
DROP TABLE IF EXISTS student_schooling CASCADE;
DROP TABLE IF EXISTS student_degrees CASCADE;
DROP TABLE IF EXISTS student_personal CASCADE;
DROP TABLE IF EXISTS field_permissions CASCADE;
DROP TABLE IF EXISTS student_change_requests CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS broadcast_templates CASCADE;
DROP TABLE IF EXISTS eligibility_template_departments CASCADE;
DROP TABLE IF EXISTS eligibility_template_batches CASCADE;
DROP TABLE IF EXISTS eligibility_templates CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS chat_groups CASCADE;
DROP TABLE IF EXISTS chat_group_members CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_attachments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 2. CORE IDENTITY & AUTH
-- ==========================================
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'super_admin', 'coordinator')),
    name VARCHAR(150),
    department_code VARCHAR(20), -- Only used for coordinators (FK added after departments table)
    profile_photo_url TEXT,
    
    -- Notification Token
    fcm_token TEXT,

    -- Security Flags
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ==========================================
-- 3. MASTER DATA Management (SPOCs, Departments, Batches)
-- ==========================================
-- 3.1 Single Point of Contacts (Master Table)
-- Design Rationale: SPOCs are entities that can exist independently of a drive. 
-- They can be assigned to multiple drives over time.
CREATE TABLE spocs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 Departments Master
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g. "Computer Science and Engineering"
    code VARCHAR(20) UNIQUE NOT NULL,  -- e.g. "CSE", "MCA"
    type VARCHAR(20) DEFAULT 'UG' CHECK (type IN ('UG', 'PG', 'PhD')),
    is_active BOOLEAN DEFAULT TRUE
);

-- Add FK for users.department_code -> departments.code (deferred because departments created after users)
ALTER TABLE users ADD CONSTRAINT fk_users_department 
    FOREIGN KEY (department_code) REFERENCES departments(code) ON DELETE SET NULL;

-- 3.3 Batches Master
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    year INT UNIQUE NOT NULL, -- e.g. 2026
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 4. STUDENT PROFILE MODULE
-- ==========================================

-- 4.1 Personal Identity
CREATE TABLE student_personal (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    register_number VARCHAR(50) UNIQUE, 
    batch_year INT REFERENCES batches(year) ON DELETE CASCADE,                     
    department VARCHAR(20) REFERENCES departments(code) ON DELETE CASCADE,            
    
    -- Dashboard Filtering Fields
    student_type VARCHAR(20) DEFAULT 'Regular' CHECK (student_type IN ('Regular', 'Lateral')),
    placement_willingness VARCHAR(20) DEFAULT 'Interested' CHECK (placement_willingness IN ('Interested', 'Not Interested', 'Higher Studies', 'Entrepreneurship')),
    
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    mobile_number VARCHAR(15),
    
    -- Address (Simplified as requested)
    -- Address
    address_line_1 TEXT,
    address_line_2 TEXT,
    state VARCHAR(100),
    
    -- Identity Numbers
    pan_number VARCHAR(20),
    aadhar_number VARCHAR(20),
    
    -- Social Links (JSONB for flexibility)
    social_links JSONB DEFAULT '{}', -- e.g. {"linkedin": "url", "github": "url", "portfolio": "url"}
    language_skills JSONB DEFAULT '[]', -- e.g. ["English", "Tamil"]
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.2 Academic Summary
-- 4.2 Academic History (Schooling + Overview)
CREATE TABLE student_schooling (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Board Marks
    tenth_mark DECIMAL(5,2),
    tenth_board VARCHAR(100),
    tenth_year_pass INT,
    tenth_institution VARCHAR(150),
    
    twelfth_mark DECIMAL(5,2),
    twelfth_board VARCHAR(100),
    twelfth_year_pass INT,
    twelfth_institution VARCHAR(150),

    -- Diploma (Important for Laterals)
    diploma_mark DECIMAL(5,2),
    diploma_year_pass INT,
    diploma_institution VARCHAR(150),

    -- Backlogs & History (Overall)
    current_backlogs INT DEFAULT 0,
    history_of_backlogs INT DEFAULT 0,
    gap_years INT DEFAULT 0,
    gap_reason TEXT
);

-- 4.3 Higher Education Degrees (Score Card Only)
CREATE TABLE student_degrees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    degree_level VARCHAR(10) CHECK (degree_level IN ('UG', 'PG')),
    
    -- Only Academic Performance Data
    year_pass INT,
    cgpa DECIMAL(4,2),
    institution VARCHAR(255), -- [NEW] Added for UG/PG Institution names
    
    -- Semester GPAs stored as JSONB for flexibility
    -- Structure: {"1": 8.5, "2": 9.0} or Array [8.5, 9.0]
    semester_gpas JSONB DEFAULT '[]', 
    
    CONSTRAINT unique_degree_level_per_user UNIQUE (user_id, degree_level)
);


-- 4.3 Documents (Reduced to core docs)
CREATE TABLE student_documents (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    resume_url TEXT,
    -- Timestamps
    resume_updated_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 5. PLACEMENT DRIVE MODULE
-- ==========================================
CREATE TABLE placement_drives (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posted_by BIGINT REFERENCES users(id),
    
    -- Job Details
    company_name VARCHAR(150) NOT NULL,
    job_description TEXT,
    website VARCHAR(255),  -- [NEW]
    logo_url TEXT,         -- [NEW]
    
    -- Categories
    drive_type VARCHAR(50) CHECK (drive_type IN ('Full-Time', 'Internship', 'Internship to Full-Time', 'Internship and Full-Time')),
    company_category VARCHAR(50) CHECK (company_category IN ('Core', 'IT', 'Service', 'Non-Tech', 'Product', 'Start-up', 'MNC')),
    
    spoc_id BIGINT REFERENCES spocs(id) ON DELETE SET NULL, -- 1-to-N: one drive has one SPOC
    
    location VARCHAR(255),
    location_type VARCHAR(20) DEFAULT 'On-Site' CHECK (location_type IN ('On-Site', 'Hybrid', 'Remote')),

    -- Financials (Moved to job_roles)
    
    -- Eligibility
    min_cgpa DECIMAL(4,2) DEFAULT 0.0,
    
    -- Additional Academic Eligibility Criteria
    tenth_percentage DECIMAL(5,2),
    twelfth_percentage DECIMAL(5,2),
    ug_min_cgpa DECIMAL(4,2),
    pg_min_cgpa DECIMAL(4,2),
    use_aggregate BOOLEAN DEFAULT FALSE,
    aggregate_percentage DECIMAL(5,2),
    
    max_backlogs_allowed INT DEFAULT 0,
    
    -- Dates & Rounds
    drive_date TIMESTAMP WITH TIME ZONE,
    deadline_date TIMESTAMP WITH TIME ZONE,
    rounds JSONB, -- Stores interview rounds structure
    
    attachments JSONB DEFAULT '[]', -- JDs, brochures, etc.
    
    status VARCHAR(20) DEFAULT 'open' 
    CHECK (status IN ('open', 'closed', 'completed', 'cancelled', 'on_hold', 'draft')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drives_deadline ON placement_drives(deadline_date);

-- 5.0 Job Roles (Multi-Role Support)
CREATE TABLE job_roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    
    role_name VARCHAR(150) NOT NULL,
    ctc VARCHAR(100),       -- e.g. "6 LPA" or "6-8 LPA"
    salary BIGINT DEFAULT 0, -- Numeric value for filtering
    stipend VARCHAR(100),   -- e.g. "30k/month"
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5.1 Drive Eligible Departments
CREATE TABLE drive_eligible_departments (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    department_code VARCHAR(20) REFERENCES departments(code) ON DELETE CASCADE,
    PRIMARY KEY (drive_id, department_code)
);

-- 5.3 Drive Eligible Batches
CREATE TABLE drive_eligible_batches (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    batch_year INT REFERENCES batches(year) ON DELETE CASCADE,
    PRIMARY KEY (drive_id, batch_year)
);

-- ==========================================
-- 6. APPLICATIONS & REGISTRATIONS
-- ==========================================
CREATE TABLE drive_applications (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status Workflow
    status VARCHAR(30) DEFAULT 'opted_in' 
    CHECK (status IN ('eligible', 'opted_in', 'opted_out', 'shortlisted', 'rejected', 'placed', 'removed', 'request_to_attend')),
    
    -- Opt-Out Handling
    opt_out_reason TEXT,
    remarks TEXT,
    
    -- Soft Deletes for Student View
    is_deleted_by_student BOOLEAN DEFAULT FALSE,

    -- Offer Details
    offer_letter_url TEXT,
    package_offered BIGINT,
    
    -- Concurrency & Audit
    actioned_by BIGINT REFERENCES users(id),
    actioned_at TIMESTAMP WITH TIME ZONE,
    
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (drive_id, student_id)
);

CREATE INDEX idx_apps_status ON drive_applications(drive_id, status);

-- 6.1 Drive Application Roles (Mapping student to applied job roles)
CREATE TABLE drive_application_roles (
    drive_id BIGINT,
    student_id BIGINT,
    role_id BIGINT REFERENCES job_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (drive_id, student_id, role_id),
    FOREIGN KEY (drive_id, student_id) REFERENCES drive_applications(drive_id, student_id) ON DELETE CASCADE
);

-- ==========================================
-- 7. UTILITIES
-- ==========================================
CREATE TABLE password_resets (
    email VARCHAR(255) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ==========================================
-- 8. ANALYTICS & VIEWS
-- ==========================================

-- View for Admin Dashboard (Students Table)
-- View for Admin Dashboard (Students Table)
CREATE VIEW view_student_details AS
SELECT 
    u.id,
    u.email,
    u.is_active,
    u.name as full_name,
    sp.register_number,
    sp.department,
    sp.batch_year,
    sp.student_type,
    sp.placement_willingness,
    sp.mobile_number,
    deg.cgpa as ug_cgpa,
    sch.current_backlogs,
    sd.resume_url,
    u.profile_photo_url
FROM users u
JOIN student_personal sp ON u.id = sp.user_id
LEFT JOIN student_schooling sch ON u.id = sch.user_id
LEFT JOIN student_degrees deg ON u.id = deg.user_id AND deg.degree_level = 'UG'
LEFT JOIN student_documents sd ON u.id = sd.user_id
WHERE u.role = 'student';

-- ==========================================
-- 9. STORED PROCEDURES
-- ==========================================
CREATE OR REPLACE FUNCTION apply_for_drive(
    p_student_id BIGINT, 
    p_drive_id BIGINT,
    OUT success BOOLEAN, 
    OUT message TEXT
) 
AS $$
DECLARE
    v_drive_deadline TIMESTAMP WITH TIME ZONE;
    v_drive_status VARCHAR;
    v_min_cgpa DECIMAL;
    v_max_backlogs INT;
    v_student_cgpa DECIMAL;
    v_student_backlogs INT;
BEGIN
    success := FALSE;
    message := '';

    -- A. Get Drive Details
    SELECT deadline_date, status, min_cgpa, max_backlogs_allowed
    INTO v_drive_deadline, v_drive_status, v_min_cgpa, v_max_backlogs
    FROM placement_drives WHERE id = p_drive_id;

    IF NOT FOUND THEN
        message := 'Drive not found';
        RETURN;
    END IF;

    -- B. Validation Checks
    IF v_drive_status != 'open' THEN
        message := 'This drive is no longer accepting applications';
        RETURN;
    END IF;

    IF NOW() > v_drive_deadline THEN
        message := 'Deadline has passed';
        RETURN;
    END IF;

    -- C. Get Student Data (Fetch Highest Degree CGPA or UG? Typically UG for now, or MAX)
    -- Assuming Eligibility is based on the highest active degree or specifically UG/PG based on drive type.
    -- For simplicity, we check UG CGPA if existing, else take PG. Or simpler: Take max CGPA.
    -- In this implementation, we take UG CGPA as default.
    
    SELECT d.cgpa INTO v_student_cgpa
    FROM student_degrees d
    WHERE d.user_id = p_student_id AND d.degree_level = 'UG';
    
    SELECT current_backlogs INTO v_student_backlogs
    FROM student_schooling WHERE user_id = p_student_id;
    
    IF v_student_cgpa IS NULL THEN
        -- Fallback to PG if UG is not found (e.g. for pure PG student?)
        SELECT d.cgpa INTO v_student_cgpa
        FROM student_degrees d
        WHERE d.user_id = p_student_id AND d.degree_level = 'PG';
    END IF;

    IF v_student_cgpa IS NULL THEN
         message := 'Student academic profile incomplete';
         RETURN;
    END IF;

    -- D. Eligibility Check
    IF v_student_cgpa < v_min_cgpa THEN
        message := 'CGPA criteria not met';
        RETURN;
    END IF;

    IF v_student_backlogs > v_max_backlogs THEN
        message := 'Backlog criteria not met';
        RETURN;
    END IF;

    -- E. Insert Application
    BEGIN
        INSERT INTO drive_applications (drive_id, student_id, status, applied_at)
        VALUES (p_drive_id, p_student_id, 'opted_in', NOW());
        
        success := TRUE;
        message := 'Application submitted successfully';
        RETURN;
    EXCEPTION 
        WHEN unique_violation THEN
            success := FALSE;
            message := 'You have already applied for this drive';
            RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Seed Departments (before users because coordinator references department_code FK)
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
('M.Tech IT', 'M.Tech IT', 'PG', TRUE);

-- Seed Batches
INSERT INTO batches (year, is_active) VALUES 
(2024, TRUE),
(2025, TRUE),
(2026, TRUE),
(2027, TRUE)
ON CONFLICT (year) DO NOTHING;

-- Seed Super Admin (user_id=1)
INSERT INTO users (email, password_hash, role, name, is_active) 
VALUES ('admin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'super_admin', 'Super Admin', TRUE);

-- Seed Admins (user_id=2, user_id=3)
INSERT INTO users (email, password_hash, role, name, is_active) 
VALUES ('dakshanamoorthy@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'admin', 'Dakshanamoorthy', TRUE);

INSERT INTO users (email, password_hash, role, name, is_active) 
VALUES ('kavin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'admin', 'Kavin', TRUE);

-- Seed Coordinator (user_id=4, MCA Department)
INSERT INTO users (email, password_hash, role, name, department_code, is_active) 
VALUES ('rahunathan@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'coordinator', 'Rahunathan', 'MCA', TRUE);

-- ALL CREDENTIALS USE PASSWORD: qwerty

-- Seed SPOCs
INSERT INTO spocs (name, designation, mobile_number, email) VALUES
('Dakshanamoorthy', 'Placement Head', '9876543210', 'dakshanamoorthy@gmail.com');

-- Seed Student User (Harikrishnan N)
-- Password: qwerty -> $2a$10$22qShrVocUBSgXlVWIvueeSnNydE.KKjhj/45X5NHbZQW4GSjZBhu
DO $$
DECLARE
    new_user_id BIGINT;
BEGIN
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES ('Harikrishnan N', 'harikrishnann.24mca@kongu.edu', '$2a$10$22qShrVocUBSgXlVWIvueeSnNydE.KKjhj/45X5NHbZQW4GSjZBhu', 'student', TRUE)
    RETURNING id INTO new_user_id;

    INSERT INTO student_personal (user_id, register_number, batch_year, department, gender, mobile_number)
    VALUES (new_user_id, '24MCR029', 2024, 'MCA', 'Male', '9876543210');
    
    -- Ignore if user already exists
    NULL;
END $$;

-- ==========================================
-- 10. FIELD PERMISSIONS & CHANGE REQUESTS
-- ==========================================

-- 10.1 Field Permissions (Admin Control)
CREATE TABLE field_permissions (
    field_name VARCHAR(100) PRIMARY KEY, -- e.g. "mobile_number", "cgpa"
    label VARCHAR(100) NOT NULL,         -- e.g. "Mobile Number", "CGPA"
    is_enabled BOOLEAN DEFAULT FALSE,    -- If TRUE, student can edit. If FALSE, edit requires approval/is disabled.
    category VARCHAR(50)                 -- e.g. "Personal", "Academic", "Identity"
);

-- Seed Initial Permissions
INSERT INTO field_permissions (field_name, label, is_enabled, category) VALUES
('mobile_number', 'Mobile Number', TRUE, 'Personal'),
('dob', 'Date of Birth', FALSE, 'Personal'),
('address', 'Address', TRUE, 'Personal'),
('placement_willingness', 'Placement Willingness', TRUE, 'Personal'),
('social_links', 'Social Links', TRUE, 'Personal'),
('tenth_mark', '10th Mark', FALSE, 'Academic'),
('twelfth_mark', '12th Mark', FALSE, 'Academic'),
('diploma_mark', 'Diploma Mark', FALSE, 'Academic'),
('ug_cgpa', 'UG CGPA', FALSE, 'Academic'),
('pg_cgpa', 'PG CGPA', FALSE, 'Academic'),
('history_of_backlogs', 'History of Backlogs', FALSE, 'Academic'),
('current_backlogs', 'Current Backlogs', FALSE, 'Academic');

-- 10.2 Student Change Requests
CREATE TABLE student_change_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    field_name VARCHAR(100) REFERENCES field_permissions(field_name),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    
    status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
    
    admin_comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    handled_at TIMESTAMP WITH TIME ZONE,
    handled_by BIGINT REFERENCES users(id),
    -- Soft Deletes for Student View
    is_deleted_by_student BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_requests_status ON student_change_requests(status);
CREATE INDEX idx_requests_student ON student_change_requests(student_id);

-- ==========================================
-- 11. ROLE PERMISSIONS & ACTIVITY LOG
-- ==========================================

-- 11.1 Role-Based Permissions (Per-User Override)
CREATE TABLE role_permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(50) NOT NULL,
    is_granted BOOLEAN DEFAULT TRUE,
    granted_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_permission UNIQUE (user_id, permission_key)
);

CREATE INDEX idx_role_permissions_user ON role_permissions(user_id);

-- 11.2 Activity Log (Audit Trail)
CREATE TABLE activity_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 11.3 System Settings (Key-Value Store)
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT REFERENCES users(id)
);

-- Seed defaults for system settings
INSERT INTO system_settings (key, value) VALUES
('college_name', 'Kongu Engineering College'),
('college_logo_url', '');

-- Seed default permissions for admin users (user_id=2 dakshanamoorthy, user_id=3 kavin)
INSERT INTO role_permissions (user_id, permission_key, is_granted) VALUES
(2, 'manage_drives', TRUE),
(2, 'manage_students', TRUE),
(2, 'approve_changes', TRUE),
(2, 'manage_spocs', TRUE),
(2, 'manage_storage', TRUE),
(2, 'export_data', TRUE),
(2, 'manual_drive_ops', TRUE),
(2, 'view_analytics', TRUE),
(3, 'manage_drives', TRUE),
(3, 'manage_students', TRUE),
(3, 'approve_changes', TRUE),
(3, 'manage_spocs', TRUE),
(3, 'manage_storage', TRUE),
(3, 'export_data', TRUE),
(3, 'manual_drive_ops', TRUE),
(3, 'view_analytics', TRUE);

-- Seed permissions for coordinator (user_id=4 rahunathan - department-scoped)
INSERT INTO role_permissions (user_id, permission_key, is_granted) VALUES
(4, 'manage_drives', TRUE),
(4, 'manage_students', TRUE),
(4, 'approve_changes', TRUE),
(4, 'manual_drive_ops', TRUE),
(4, 'view_analytics', TRUE);
-- ==========================================
-- CHAT MODULE SCHEMA
-- ==========================================

-- 1. Chat Groups
CREATE TABLE chat_groups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255), -- Null for direct messages
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Group Members
CREATE TABLE chat_group_members (
    group_id BIGINT REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON chat_group_members(user_id);

-- 3. Messages
CREATE TABLE chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    content TEXT,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'student_card', 'deleted')),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
    
    -- Metadata for specific types (e.g., student_card_id, file_url)
    metadata JSONB DEFAULT '{}', 
    
    read_by JSONB DEFAULT '[]', -- List of user_ids who read the message
    
    -- New Fields for Chat Features
    reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    deleted_for JSONB DEFAULT '[]', -- List of user IDs for whom the message is deleted
    forwarded BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_group ON chat_messages(group_id, created_at DESC);

-- 4. Attachments (Optional, linked to messages)
CREATE TABLE chat_attachments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 16. Broadcast Templates
CREATE TABLE broadcast_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('WHATSAPP', 'EMAIL')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Eligibility Templates
CREATE TABLE eligibility_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    
    -- Eligibility Criteria (Match placement_drives columns)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17.1 Eligibility Template Departments
CREATE TABLE eligibility_template_departments (
    template_id BIGINT REFERENCES eligibility_templates(id) ON DELETE CASCADE,
    department_code VARCHAR(20) REFERENCES departments(code) ON DELETE CASCADE,
    PRIMARY KEY (template_id, department_code)
);

-- 17.2 Eligibility Template Batches
CREATE TABLE eligibility_template_batches (
    template_id BIGINT REFERENCES eligibility_templates(id) ON DELETE CASCADE,
    batch_year INT REFERENCES batches(year) ON DELETE CASCADE,
    PRIMARY KEY (template_id, batch_year)
);
