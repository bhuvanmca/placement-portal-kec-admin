-- ==========================================
-- Migration: Create Companies Table
-- Description: Stores individual company details and their recruitment readiness checklist.
-- ==========================================

CREATE TABLE IF NOT EXISTS companies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    visit_date DATE NOT NULL,
    incharge VARCHAR(150),
    eligible_departments TEXT,
    salary VARCHAR(100),
    eligibility TEXT,
    remarks TEXT,
    checklist JSONB DEFAULT '{
        "approved": false,
        "cab": false,
        "accommodation": false,
        "rounds": false,
        "qp_printout": false
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add sample data (matching previous Next.js sample)
INSERT INTO companies (name, visit_date, incharge, eligible_departments, salary, eligibility, remarks, checklist)
VALUES (
    'Zoho', 
    '2024-03-25', 
    'MCA, data', 
    'CSE, IT, MCA', 
    '5LPA', 
    '65% & above', 
    'remarks data', 
    '{"approved": true, "cab": false, "accommodation": false, "rounds": true, "qp_printout": false}'
);

INSERT INTO companies (name, visit_date, incharge, eligible_departments, salary, eligibility, remarks, checklist)
VALUES (
    'TCS', 
    '2024-04-10', 
    'John Doe', 
    'All Engineering', 
    '3.5LPA - 7LPA', 
    '60% throughout', 
    'NQT score required', 
    '{"approved": false, "cab": false, "accommodation": false, "rounds": false, "qp_printout": false}'
);
