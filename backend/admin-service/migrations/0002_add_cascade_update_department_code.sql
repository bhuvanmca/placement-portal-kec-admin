-- ==========================================
-- Add ON UPDATE CASCADE to department code FKs
-- Fixes: updating department code fails due to FK violations
-- ==========================================

-- 1. student.student_personal.department → departments(code)
DO $$
BEGIN
    ALTER TABLE student.student_personal
        DROP CONSTRAINT IF EXISTS student_personal_department_fkey;
    ALTER TABLE student.student_personal
        ADD CONSTRAINT student_personal_department_fkey
        FOREIGN KEY (department) REFERENCES public.departments(code)
        ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'student_personal FK update skipped: %', SQLERRM;
END $$;

-- 2. admin.eligibility_template_departments.department_code → departments(code)
DO $$
BEGIN
    ALTER TABLE admin.eligibility_template_departments
        DROP CONSTRAINT IF EXISTS eligibility_template_departments_department_code_fkey;
    ALTER TABLE admin.eligibility_template_departments
        ADD CONSTRAINT eligibility_template_departments_department_code_fkey
        FOREIGN KEY (department_code) REFERENCES public.departments(code)
        ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'eligibility_template_departments FK update skipped: %', SQLERRM;
END $$;

-- 3. drive.drive_eligible_departments.department_code → departments(code)
DO $$
BEGIN
    ALTER TABLE drive.drive_eligible_departments
        DROP CONSTRAINT IF EXISTS drive_eligible_departments_department_code_fkey;
    ALTER TABLE drive.drive_eligible_departments
        ADD CONSTRAINT drive_eligible_departments_department_code_fkey
        FOREIGN KEY (department_code) REFERENCES public.departments(code)
        ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'drive_eligible_departments FK update skipped: %', SQLERRM;
END $$;
