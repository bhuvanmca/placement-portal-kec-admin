-- ==========================================
-- PLACEMENT MANAGEMENT SYSTEM - UPDATED SCHEMA (V2)
-- Based on Frontend Requirements & Best Practices
-- ==========================================

-- ==========================================
-- 1. CLEANUP
-- ==========================================
DROP VIEW IF EXISTS view_student_details CASCADE;
DROP FUNCTION IF EXISTS apply_for_drive(BIGINT, BIGINT);
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS drive_applications CASCADE;
DROP TABLE IF EXISTS placement_drives CASCADE;
DROP TABLE IF EXISTS student_documents CASCADE;
DROP TABLE IF EXISTS student_family_details CASCADE;
DROP TABLE IF EXISTS student_semester_results CASCADE;
DROP TABLE IF EXISTS student_academics CASCADE;
DROP TABLE IF EXISTS student_personal CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 2. CORE IDENTITY & AUTH
-- ==========================================
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'coordinator')), -- Added coordinator
    
    -- Security Flags
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ==========================================
-- 3. STUDENT PROFILE MODULE
-- ==========================================

-- 3.1 Personal Identity
CREATE TABLE student_personal (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    register_number VARCHAR(50) UNIQUE, 
    batch_year INT,                     
    department VARCHAR(100),            
    
    -- [UPDATED] New fields for Dashboard filtering
    student_type VARCHAR(20) DEFAULT 'Regular' CHECK (student_type IN ('Regular', 'Lateral')),
    placement_willingness VARCHAR(20) DEFAULT 'Interested' CHECK (placement_willingness IN ('Interested', 'Not Interested', 'Higher Studies', 'Entrepreneurship')),
    
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    mobile_number VARCHAR(15),
    residence_type VARCHAR(20),         
    
    -- [UPDATED] Social Links for Profile
    social_links JSONB DEFAULT '{}', -- e.g. {"linkedin": "url", "github": "url", "portfolio": "url"}
    language_skills JSONB DEFAULT '[]',
    
    about_me TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 Academic Summary
CREATE TABLE student_academics (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- [UPDATED] Added Technical Skills (distinct from languages)
    technical_skills JSONB DEFAULT '[]', -- e.g. ["React", "Python", "SQL"]
    
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
    
    -- Degree Stats
    ug_degree VARCHAR(100),        -- e.g. "B.E"
    ug_specialisation VARCHAR(100), -- e.g. "CSE"
    ug_institution VARCHAR(150),
    ug_year_pass INT,
    ug_cgpa DECIMAL(4,2),
    
    pg_degree VARCHAR(100),
    pg_specialisation VARCHAR(100),
    pg_institution VARCHAR(150),
    pg_year_pass INT,
    pg_cgpa DECIMAL(4,2),
    
    -- Backlogs
    current_backlogs INT DEFAULT 0,
    history_of_backlogs INT DEFAULT 0,
    gap_years INT DEFAULT 0,
    gap_reason TEXT
);

-- 3.3 Semester Results
CREATE TABLE student_semester_results (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    degree_level VARCHAR(10) CHECK (degree_level IN ('UG', 'PG')),
    semester_number INT NOT NULL,
    gpa DECIMAL(4,2) NOT NULL,
    credits_registered DECIMAL(5,2),
    credits_earned DECIMAL(5,2),
    UNIQUE(user_id, degree_level, semester_number)
);

-- 3.4 Address & Family
CREATE TABLE student_family_details (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    father_name VARCHAR(100),
    father_occupation VARCHAR(100),
    father_mobile VARCHAR(15),
    mother_name VARCHAR(100),
    mother_mobile VARCHAR(15),
    guardian_mobile VARCHAR(15),
    address_line_1 TEXT,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    alternate_email VARCHAR(255)
);

-- 3.5 Documents
CREATE TABLE student_documents (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    resume_url TEXT,
    profile_photo_url TEXT,
    aadhar_card_url TEXT,
    pan_card_url TEXT,
    tenth_mark_sheet_url TEXT,
    twelfth_mark_sheet_url TEXT
);

-- ==========================================
-- 4. PLACEMENT DRIVE MODULE
-- ==========================================
CREATE TABLE placement_drives (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posted_by BIGINT REFERENCES users(id),
    
    -- Job Details
    company_name VARCHAR(150) NOT NULL,
    job_role VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    
    -- Categories
    drive_type VARCHAR(50) CHECK (drive_type IN ('Full-Time', 'Internship', 'Freelance', 'Internship to Full-Time', 'Internship and Full-Time', 'Part-Time')),
    company_category VARCHAR(50) CHECK (company_category IN ('Core', 'IT', 'Service', 'Non-Tech')),
    drive_objective VARCHAR(50) CHECK (drive_objective IN ('Placement', 'Academic Internship')),
    
    -- [UPDATED] Flag for Quick/External drives
    is_quick_drive BOOLEAN DEFAULT FALSE,
    
    -- Financials
    ctc_min BIGINT,
    ctc_max BIGINT,
    ctc_display VARCHAR(100),
    stipend_min BIGINT, -- Added for internships
    stipend_max BIGINT,
    
    -- Eligibility
    min_cgpa DECIMAL(4,2) DEFAULT 0.0,
    max_backlogs_allowed INT DEFAULT 0,
    eligible_branches JSONB,       -- e.g. ["CSE", "IT", "ECE"]
    eligible_batch_years JSONB,    -- e.g. [2024, 2025]
    
    -- Dates (Rounds can be JSONB for flexibility)
    drive_date DATE,
    deadline_date TIMESTAMP WITH TIME ZONE,
    rounds_details JSONB, -- [{"name": "Aptitude", "date": "..."}]
    
    status VARCHAR(20) DEFAULT 'open' 
    CHECK (status IN ('open', 'closed', 'completed', 'cancelled', 'on_hold')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drives_deadline ON placement_drives(deadline_date);

-- ==========================================
-- 5. APPLICATIONS & REGISTRATIONS
-- ==========================================
CREATE TABLE drive_applications (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status Workflow
    status VARCHAR(30) DEFAULT 'opted_in' 
    CHECK (status IN ('eligible', 'opted_in', 'opted_out', 'shortlisted', 'rejected', 'placed', 'removed')),
    
    -- [UPDATED] Offer Details
    offer_letter_url TEXT,
    package_offered BIGINT, -- Actual package offered to this student
    
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (drive_id, student_id)
);

CREATE INDEX idx_apps_status ON drive_applications(drive_id, status);

-- ==========================================
-- 6. UTILITIES
-- ==========================================
CREATE TABLE password_resets (
    email VARCHAR(255) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ==========================================
-- 7. ANALYTICS & VIEWS (New)
-- ==========================================

-- View for Admin Dashboard (Students Table)
CREATE VIEW view_student_details AS
SELECT 
    u.id,
    u.email,
    u.is_active,
    sp.full_name,
    sp.register_number,
    sp.department,
    sp.batch_year,
    sp.student_type,
    sp.placement_willingness,
    sp.mobile_number,
    sa.ug_cgpa,
    sa.current_backlogs,
    sd.resume_url,
    sd.profile_photo_url
FROM users u
JOIN student_personal sp ON u.id = sp.user_id
LEFT JOIN student_academics sa ON u.id = sa.user_id
LEFT JOIN student_documents sd ON u.id = sd.user_id
WHERE u.role = 'student';

-- ==========================================
-- 8. STORED PROCEDURES
-- ==========================================
CREATE OR REPLACE FUNCTION apply_for_drive(
    p_student_id BIGINT, 
    p_drive_id BIGINT,
    OUT success BOOLEAN, 
    OUT message TEXT
) 
AS $$
DECLARE
    v_drive_deadline TIMESTAMP;
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

    -- C. Get Student Data
    SELECT ug_cgpa, current_backlogs INTO v_student_cgpa, v_student_backlogs
    FROM student_academics WHERE user_id = p_student_id;
    
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

-- Seed Admin
INSERT INTO users (email, password_hash, role, is_active) 
VALUES ('admin@kongu.edu', '$2a$12$Xl7N1KACfTlzRaTWEKeDl.w5CnrrCrzh.4R8WZR3WxwZh.lkrpLay', 'admin', TRUE);
