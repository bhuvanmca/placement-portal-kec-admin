-- ==========================================
-- DRIVE SERVICE — Schema Definition
-- Schema: drive (search_path: drive, public)
--
-- Owns: placement_drives, job_roles,
--       drive_applications, drive_application_roles,
--       drive_eligible_departments, drive_eligible_batches,
--       drive_spocs
-- Reads: users, departments, batches (public)
-- ==========================================

CREATE SCHEMA IF NOT EXISTS drive;
SET search_path TO drive, public;

-- Placement Drives
CREATE TABLE IF NOT EXISTS placement_drives (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posted_by BIGINT REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    job_description TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    location VARCHAR(255) NOT NULL,
    location_type VARCHAR(50),
    drive_type VARCHAR(50),
    company_category VARCHAR(50),
    spoc_id BIGINT,
    offer_type VARCHAR(20) DEFAULT 'Regular',
    allow_placed_candidates BOOLEAN DEFAULT FALSE,
    min_cgpa DECIMAL(4,2),
    tenth_percentage DECIMAL(5,2),
    twelfth_percentage DECIMAL(5,2),
    ug_min_cgpa DECIMAL(4,2),
    pg_min_cgpa DECIMAL(4,2),
    use_aggregate BOOLEAN DEFAULT FALSE,
    aggregate_percentage DECIMAL(5,2),
    eligible_gender VARCHAR(20) DEFAULT 'All',
    max_backlogs_allowed INT,
    rounds JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    drive_date DATE NOT NULL,
    deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft', 'completed', 'cancelled')),
    excluded_student_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Roles per Drive
CREATE TABLE IF NOT EXISTS job_roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    role_name VARCHAR(150) NOT NULL,
    ctc VARCHAR(50) NOT NULL,
    salary BIGINT,
    stipend VARCHAR(50)
);

-- Drive Eligible Departments
CREATE TABLE IF NOT EXISTS drive_eligible_departments (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    department_code VARCHAR(20) REFERENCES departments(code) ON DELETE CASCADE,
    PRIMARY KEY (drive_id, department_code)
);

-- Drive Eligible Batches
CREATE TABLE IF NOT EXISTS drive_eligible_batches (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    batch_year INT REFERENCES batches(year) ON DELETE CASCADE,
    PRIMARY KEY (drive_id, batch_year)
);

-- Drive Applications
CREATE TABLE IF NOT EXISTS drive_applications (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'opted_in'
        CHECK (status IN (
            'opted_in', 'opted_out',
            'request_to_attend',
            'shortlisted', 'rejected', 'placed'
        )),
    actioned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    actioned_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    opt_out_reason TEXT DEFAULT '',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (drive_id, student_id)
);

-- Application Role Selections
CREATE TABLE IF NOT EXISTS drive_application_roles (
    drive_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    role_id BIGINT REFERENCES job_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (drive_id, student_id, role_id),
    FOREIGN KEY (drive_id, student_id) REFERENCES drive_applications(drive_id, student_id) ON DELETE CASCADE
);

-- Drive SPOCs (linking drives to SPOCs)
CREATE TABLE IF NOT EXISTS drive_spocs (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    spoc_id BIGINT NOT NULL,
    PRIMARY KEY (drive_id, spoc_id)
);
