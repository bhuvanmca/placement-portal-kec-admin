export interface StudentProfile {
  id: number;
  email: string;
  full_name: string;
  register_number: string;
  department: string;
  mobile_number: string;
  batch_year: number;
  dob?: string;
  gender?: string;
  address_line_1?: string;
  address_line_2?: string;
  state?: string;
  aadhar_number?: string;
  pan_number?: string;
  social_links?: {
    linkedin?: string;
    github?: string;
    leetcode?: string;
  };
  language_skills?: string[];
  tenth_mark?: number;
  tenth_board?: string;
  tenth_institution?: string;
  twelfth_mark?: number;
  twelfth_board?: string;
  twelfth_institution?: string;
  diploma_mark?: number;
  diploma_institution?: string;
  ug_cgpa?: number;
  ug_gpa_s1?: number;
  ug_gpa_s2?: number;
  ug_gpa_s3?: number;
  ug_gpa_s4?: number;
  ug_gpa_s5?: number;
  ug_gpa_s6?: number;
  ug_gpa_s7?: number;
  ug_gpa_s8?: number;
  ug_gpa_s9?: number;
  ug_gpa_s10?: number;
  pg_cgpa?: number;
  pg_gpa_s1?: number;
  pg_gpa_s2?: number;
  pg_gpa_s3?: number;
  pg_gpa_s4?: number;
  pg_gpa_s5?: number;
  pg_gpa_s6?: number;
  pg_gpa_s7?: number;
  pg_gpa_s8?: number;
  current_backlogs?: number;
  history_of_backlogs?: number;
  gap_years?: number;
  gap_reason?: string;
  profile_photo_url?: string;
  is_blocked?: boolean;
}

export interface JobRole {
  id: number;
  drive_id: number;
  role_name: string;
  ctc: string;
  salary: number;
  stipend?: string;
}

export interface DriveRound {
  name: string;
  date: string;
  description: string;
}

export interface DriveAttachment {
  name: string;
  url: string;
}

export interface Drive {
  id: number;
  company_name: string;
  job_description: string;
  website?: string;
  logo_url?: string;
  location?: string;
  location_type?: string;
  drive_type: string;
  company_category: string;
  roles: JobRole[];
  offer_type: string;
  allow_placed_candidates: boolean;
  min_cgpa: number;
  drive_date: string;
  deadline_date: string;
  status: string;
  created_at: string;
  applicant_count: number;
  user_status?: string;
  is_eligible: boolean;
  batch_year?: string;
  rounds?: DriveRound[];
  attachments?: DriveAttachment[];
}

export interface ChangeRequest {
  id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  status: string;
  reason?: string;
  admin_comment?: string;
  remarks?: string;
  created_at: string;
}

export interface DriveRequest {
  id: number;
  drive_id: number;
  status: string;
  company_name?: string;
  applied_role_names?: string;
  remarks?: string;
  created_at: string;
  drive?: Drive;
}

export interface LoginResponse {
  token: string;
  email: string;
  role: string;
  full_name: string;
}
