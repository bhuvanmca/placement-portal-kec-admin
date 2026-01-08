# 🎓 Placement Portal KEC

![Showcase](/assets/showcase.png)

A robust, production-grade backend API built with **Go (Golang)** and **PostgreSQL** to manage campus placement drives. This system handles high-concurrency student applications, role-based access control (RBAC), background automation, and secure file handling.

## 🚀 Tech Stack

* **Language:** Go (1.21+)
* **Framework:** [Fiber v2](https://gofiber.io/) (Fastest HTTP engine for Go)
* **Database:** PostgreSQL (with `pgx/v5` driver & connection pooling)
* **Authentication:** JWT (Stateless, Secure)
* **File Storage:** Cloudinary (Free Tier)
* **Automation:** Native Go Goroutines (Background Scheduler)
* **Architecture:** Clean Architecture (Repository Pattern)

---

## 🛠️ Setup & Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000

# Database Connection
DB_URL=postgres://user:password@localhost:5432/placement_db?sslmode=disable

# Security
JWT_SECRET=your_internal_secret_key_2026

# Email Service (Gmail App Password)
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password

# File Storage (Cloudinary)
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

```

### 2. Run the Server

```bash
go run cmd/api/main.go

```

* **API:** `http://localhost:3000`
* **Scheduler:** Starts automatically in the background (checks deadlines & cleans OTPs every minute).

---

## 🗄️ Database Schema & SQL Reference

Run this script to initialize the database state.

### 1. Core Tables

```sql
-- Users (Auth)
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Student Profiles
CREATE TABLE student_personal (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    register_number VARCHAR(50) UNIQUE,
    batch_year INT,
    department VARCHAR(100),
    mobile_number VARCHAR(15),
    language_skills JSONB -- e.g. {"speak": ["English"], "read": ["Tamil"]}
);

-- Academic Scores
CREATE TABLE student_academics (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ug_cgpa DECIMAL(4,2),
    pg_cgpa DECIMAL(4,2),
    current_backlogs INT DEFAULT 0,
    history_of_backlogs INT DEFAULT 0
);

-- Documents (Cloudinary URLs)
CREATE TABLE student_documents (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    resume_url TEXT,
    profile_photo_url TEXT,
    aadhar_card_url TEXT,
    pan_card_url TEXT
);

-- OTP Management
CREATE TABLE password_resets (
    email VARCHAR(255) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

```

### 2. Placement Module

```sql
-- Placement Drives
CREATE TABLE placement_drives (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posted_by BIGINT REFERENCES users(id),
    company_name VARCHAR(150),
    job_role VARCHAR(150),
    description TEXT,
    drive_type VARCHAR(50),      -- 'Full-Time', 'Internship'
    company_category VARCHAR(50), -- 'IT', 'Core'
    ctc_display VARCHAR(100),    -- "10 LPA"
    ctc_max BIGINT,              -- 1000000 (For sorting)
    min_cgpa DECIMAL(4,2),
    max_backlogs_allowed INT,
    drive_date DATE,
    deadline_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed', 'cancelled', 'on_hold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Applications (The Join Table)
CREATE TABLE drive_applications (
    drive_id BIGINT REFERENCES placement_drives(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'eligible' CHECK (status IN ('eligible', 'opted_in', 'opted_out', 'placed', 'shortlisted', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (drive_id, student_id)
);

```

### 3. Critical Stored Procedures

Atomic Apply Function (Concurrency Safe)

```sql
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
    v_student_cgpa DECIMAL;
BEGIN
    success := FALSE;
    
    -- 1. Check Drive Status
    SELECT deadline_date, status, min_cgpa INTO v_drive_deadline, v_drive_status, v_min_cgpa
    FROM placement_drives WHERE id = p_drive_id;

    IF v_drive_status != 'open' OR NOW() > v_drive_deadline THEN
        message := 'Drive closed or deadline passed';
        RETURN;
    END IF;

    -- 2. Check Eligibility
    SELECT ug_cgpa INTO v_student_cgpa FROM student_academics WHERE user_id = p_student_id;
    
    IF v_student_cgpa < v_min_cgpa THEN
        message := 'CGPA criteria not met';
        RETURN;
    END IF;

    -- 3. Apply
    INSERT INTO drive_applications (drive_id, student_id, status) VALUES (p_drive_id, p_student_id, 'opted_in');
    success := TRUE;
    message := 'Application submitted';
    RETURN;
EXCEPTION WHEN unique_violation THEN
    message := 'Already applied';
END;
$$ LANGUAGE plpgsql;

```

---

## 📚 API Endpoints

### 🟢 Public & Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Check if server is running |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login & get JWT Token |
| `POST` | `/api/auth/logout` | Logout (Stateless) |
| `POST` | `/api/auth/forgot-password` | Request OTP via Email |
| `POST` | `/api/auth/reset-password` | Verify OTP & Reset Password |

### 🎓 Student Module

**Headers:** `Authorization: Bearer <STUDENT_TOKEN>`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/drives/home` | Get drives categorized (Upcoming, Ongoing, etc.) |
| `GET` | `/api/v1/drives` | List all drives (Filters: `?category=IT`) |
| `POST` | `/api/v1/drives/:id/apply` | Apply for a specific drive (**Atomic**) |
| `PUT` | `/api/v1/student/profile` | Update contact info, skills, and academic stats |
| `POST` | `/api/v1/student/upload` | Upload docs (`?type=resume/aadhar/pan/profile_pic`) |

### 🛡️ Admin Module

**Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

| Method | Endpoint | Description | Body / Payload |
| --- | --- | --- | --- |
| `POST` | `/api/v1/admin/drives` | Post a new placement drive | `{...drive_details}` |
| `PUT` | `/api/v1/admin/drives/:id` | Update drive details | `{...drive_details}` |
| `DELETE` | `/api/v1/admin/drives/:id` | Delete a drive | - |
| `POST` | `/api/v1/admin/drives/:id/add-student` | Force-add a student (Override checks) | `{ "student_id": 123 }` |
| `PUT` | `/api/v1/admin/users/:id/block` | Block/Unblock a Student | `{ "block": true }` |
| `PUT` | `/api/v1/admin/applications/status` | Mark Placed/Rejected | `{ "drive_id": 1, "student_id": 2, "status": "placed" }` |
| `POST` | `/api/v1/admin/students/bulk-upload` | CSV Bulk Registration | Form Data (`file`: .csv) |
| `DELETE` | `/api/v1/admin/students/:id` | Delete a single student | - |
| `DELETE` | `/api/v1/admin/students/bulk` | Bulk Delete Students (Filter) | `{ "batch_year": 2024, "department": "MCA" }` |

### 📄 CSV Format for Bulk Upload

When using `/api/v1/admin/students/bulk-upload`, ensure the CSV has the following **6 columns**:

```csv
email,name,regNo,dept,batch_year,password
student1@test.com,John Doe,24MCR001,MCA,2026,pass123
student2@test.com,Jane Smith,24MCR002,CSE,2026,pass123

```

---

## 📂 Project Structure

```text
/cmd/api          # Main entry point
/internal
  /config         # Env loader
  /database       # Postgres Connection
  /handlers       # API Controllers
  /middleware     # Auth Logic
  /models         # Go Structs
  /repository     # SQL Queries
  /routes         # URL Mapping
  /utils          # Cloudinary, Email, JWT
  /worker         # Background Scheduler (Deadlines & OTP Cleanup)

```
