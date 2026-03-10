import random

def generate_seed():
    first_names = [
        'Anbazhagan', 'Balasubramanian', 'Chandran', 'Dhanush', 'Elango', 'Ganesan', 'Hariharan', 'Ilango', 'Jagan', 'Karthikeyan', 
        'Loganathan', 'Murali', 'Naveen', 'Palani', 'Raghu', 'Sakthi', 'Tamilselvan', 'Udhaya', 'Velu', 'Yogesh',
        'Abirami', 'Bhuvana', 'Chitra', 'Deepa', 'Ezhil', 'Gayathri', 'Hemalatha', 'Indhu', 'Jayanthi', 'Kavitha', 
        'Loganayaki', 'Meena', 'Nivetha', 'Oviya', 'Poorani', 'Rekha', 'Sivakami', 'Thamarai', 'Umadevi', 'Vani', 'Yazhini'
    ]
    last_names = ['N', 'S', 'P', 'M', 'K', 'R', 'J', 'A', 'T', 'V', 'B', 'C', 'D', 'E', 'G', 'L']

    # Department format: (FullName, DeptCode, IsPG)
    departments = [
        ('Computer Science and Engineering', 'CSE', False),
        ('Information Technology', 'IT', False),
        ('Electronics and Communication Engineering', 'ECE', False),
        ('Electrical and Electronics Engineering', 'EEE', False),
        ('Mechanical Engineering', 'MECH', False),
        ('Civil Engineering', 'CIVIL', False),
        ('Artificial Intelligence and Data Science', 'AI&DS', False),
        ('Computer Science and Business Systems', 'CSBS', False),
        ('Mechatronics Engineering', 'MCT', False),
        ('Master of Business Administration', 'MBA', True),
        ('Master of Computer Applications', 'MCA', True),
        ('M.E. CSE', 'M.E CSE', True),
        ('M.Tech IT', 'M.Tech IT', True)
    ]
    batches = [2024, 2025, 2026, 2027]
    genders = ['Male', 'Female']
    
    # Password: qwerty
    password_hash = '$2a$10$22qShrVocUBSgXlVWIvueeSnNydE.KKjhj/45X5NHbZQW4GSjZBhu'
    
    sql_statements = []
    
    sql_statements.append("-- ==========================================")
    sql_statements.append("-- SEED 2000 STUDENTS (Tamil Names)")
    sql_statements.append("-- Fields: Name, Email, RegNo, Batch, Dept, Mobile, Marks, Degrees")
    sql_statements.append("-- ==========================================")
    sql_statements.append("DO $$")
    sql_statements.append("DECLARE")
    sql_statements.append("    new_user_id BIGINT;")
    sql_statements.append("BEGIN")
    
    generated_emails = set()

    for i in range(1, 2001):
        dept_name, dept_code, is_pg = random.choice(departments)
        batch = random.choice(batches)
        gender = random.choice(genders)
        
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        name = f"{fname} {lname}"
        
        # Email format: harikrishnann.24mca@kongu.edu
        safe_fname = fname.lower()
        safe_lname = lname.lower()
        batch_suffix = str(batch)[-2:]
        safe_dept = dept_code.lower().replace('&', '').replace('.', '').replace(' ', '')
        email = f"{safe_fname}{safe_lname}.{batch_suffix}{safe_dept}@kongu.edu"
        
        # Handle duplicate emails
        counter = 1
        while email in generated_emails:
            email = f"{safe_fname}{safe_lname}{counter}.{batch_suffix}{safe_dept}@kongu.edu"
            counter += 1
        generated_emails.add(email)
        
        # Profile Picture
        profile_photo_url = f"https://api.dicebear.com/7.x/initials/svg?seed={fname}+{lname}&backgroundColor=002147&textColor=ffffff"
        
        phone = f"9{i:09d}"
        
        # Consistent Register Number format: {batch_last_2}{DEPT_CODE}{index_padded}
        reg_no = f"{batch%100}{dept_code.replace('&', '').replace('.', '').replace(' ', '')}{i:03d}"
        
        # Marks Generation
        tenth_mark = round(random.uniform(75.0, 99.0), 2)
        twelfth_mark = round(random.uniform(70.0, 98.0), 2)
        ug_cgpa = round(random.uniform(6.5, 9.8), 2)
        
        backlogs = random.choice([0, 0, 0, 0, 0, 0, 1, 2, 0]) # mostly 0
        history_backlogs = backlogs + random.choice([0, 0, 1, 2])
        
        sql_statements.append(f"    -- Student {i}: {name}")
        sql_statements.append(f"    INSERT INTO public.users (name, email, password_hash, role, profile_photo_url, is_active) ")
        sql_statements.append(f"    VALUES ('{name}', '{email}', '{password_hash}', 'student', '{profile_photo_url}', TRUE) ")
        sql_statements.append(f"    RETURNING id INTO new_user_id;")
        
        sql_statements.append(f"    INSERT INTO student.student_personal (user_id, register_number, batch_year, department, gender, mobile_number) ")
        sql_statements.append(f"    VALUES (new_user_id, '{reg_no}', {batch}, '{dept_code}', '{gender}', '{phone}');")
        
        sql_statements.append(f"    INSERT INTO student.student_schooling (user_id, tenth_mark, tenth_board, tenth_year_pass, twelfth_mark, twelfth_board, twelfth_year_pass, current_backlogs, history_of_backlogs)")
        sql_statements.append(f"    VALUES (new_user_id, {tenth_mark}, 'State Board', {batch-6}, {twelfth_mark}, 'State Board', {batch-4}, {backlogs}, {history_backlogs});")
        
        sql_statements.append(f"    INSERT INTO student.student_degrees (user_id, degree_level, department_id, year_pass, cgpa, institution)")
        if not is_pg:
            # UG Student (B.E/B.Tech)
            sql_statements.append(f"    VALUES (new_user_id, 'UG', (SELECT id FROM public.departments WHERE code = '{dept_code}'), {batch}, {ug_cgpa}, 'Kongu Engineering College');")
        else:
            # PG Student (MCA/MBA/M.E)
            pg_cgpa = round(random.uniform(6.8, 9.5), 2)
            sql_statements.append(f"    VALUES (new_user_id, 'UG', (SELECT id FROM public.departments WHERE code = '{dept_code}'), {batch-2}, {ug_cgpa}, 'Other Institution');")
            sql_statements.append(f"    INSERT INTO student.student_degrees (user_id, degree_level, department_id, year_pass, cgpa, institution)")
            sql_statements.append(f"    VALUES (new_user_id, 'PG', (SELECT id FROM public.departments WHERE code = '{dept_code}'), {batch}, {pg_cgpa}, 'Kongu Engineering College');")
            
        sql_statements.append("")
            
    sql_statements.append("END $$;")
    
    with open('student_seed.sql', 'w') as f:
        f.write("\n".join(sql_statements))
        
    print("Generated student_seed.sql with 2001 students (Full Profiles, Marks, Degrees).")

if __name__ == "__main__":
    generate_seed()
