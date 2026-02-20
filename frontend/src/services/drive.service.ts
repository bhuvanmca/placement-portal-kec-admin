import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface Round {
  name: string;
  date: string;
  description: string;
}

export interface Attachment {
  name: string;
  url: string;
}

export interface JobRole {
  id: number;
  role_name: string;
  ctc: string; 
  salary: number;
  stipend: string;
}

export interface DriveApplicant {
  student_id: number;
  full_name: string;
  register_number: string;
  email: string;
  department: string;
  cgpa: number;
  status: string;
  resume_url: string;
  applied_at: string;
}

export interface DriveApplicantDetailed {
  // User Info
  id: number;
  email: string;
  is_blocked: boolean;
  last_login?: string;

  // Personal
  full_name: string;
  register_number: string;
  department: string;
  department_type: string;
  batch_year: number;
  student_type: string;
  placement_willingness: string;
  gender: string;
  dob: string;
  mobile_number: string;
  address_line_1: string;
  address_line_2: string;
  state: string;
  pan_number: string;
  aadhar_number: string;
  social_links: Record<string, string>;
  language_skills: string[];

  // Academics
  tenth_mark: number;
  tenth_board: string;
  tenth_year_pass: number;
  tenth_institution: string;

  twelfth_mark: number;
  twelfth_board: string;
  twelfth_year_pass: number;
  twelfth_institution: string;

  diploma_mark: number;
  diploma_year_pass: number;
  diploma_institution: string;

  ug_cgpa: number;
  pg_cgpa: number;

  ug_year_pass: number;
  pg_year_pass: number;

  // Semesters (Optional)
  ug_gpa_s1?: number;
  ug_gpa_s2?: number;
  ug_gpa_s3?: number;
  ug_gpa_s4?: number;
  ug_gpa_s5?: number;
  ug_gpa_s6?: number;
  ug_gpa_s7?: number;

  pg_gpa_s1?: number;
  pg_gpa_s2?: number;
  pg_gpa_s3?: number;
  pg_gpa_s4?: number;

  current_backlogs: number;
  history_of_backlogs: number;
  gap_years: number;
  gap_reason: string;

  // Docs
  resume_url: string;
  profile_photo_url: string;
  resume_updated_at?: string;

  // Application Specific
  application_status: string;
  applied_at: string;
  applied_role_ids: number[];
  opt_out_reason: string;
}

export interface Drive {
  id: number;
  company_name: string;
  job_description: string;
  location: string;
  location_type: 'On-Site' | 'Hybrid' | 'Remote';
  website?: string;
  logo_url?: string;
  drive_type: string;
  company_category: string;
  spoc_id: number;
  roles: JobRole[];
  min_cgpa: number;
  tenth_percentage?: number;
  twelfth_percentage?: number;
  ug_min_cgpa?: number;
  pg_min_cgpa?: number;
  use_aggregate?: boolean;
  aggregate_percentage?: number;
  max_backlogs_allowed: number;
  eligible_batches: number[];
  eligible_departments: string[];
  eligible_gender: string;
  rounds: Round[];
  attachments: Attachment[];
  drive_date: string;
  deadline_date: string;
  status: string;
  applicant_count?: number; 
  user_status?: string;
}

export interface CreateDriveInput {
  company_name: string;
  job_description: string;
  location: string;
  location_type: 'On-Site' | 'Hybrid' | 'Remote';
  website?: string;
  logo_url?: string;
  drive_type: string;
  company_category: string;
  spoc_id: number;
  roles: JobRole[];
  min_cgpa: number;
  tenth_percentage?: number;
  twelfth_percentage?: number;
  ug_min_cgpa?: number;
  pg_min_cgpa?: number;
  use_aggregate?: boolean;
  aggregate_percentage?: number;
  max_backlogs_allowed: number;
  eligible_batches: number[];
  eligible_departments: string[];
  eligible_gender?: string;
  rounds: Round[];
  attachments: Attachment[];
  drive_date: string;
  deadline_date: string;
  status: string;
}

export interface DriveRequest extends DriveApplicant {
  drive_id: number;
  company_name: string;
  department_type: string;
  profile_photo_url: string;
  remarks: string;
  applied_role_names: string;
}

export const driveService = {
  getAllDrives: async (filters?: { department?: string; batch?: number }) => {
    let url = API_ROUTES.DRIVES;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.batch) params.append('batch', filters.batch.toString());
      url += `?${params.toString()}`;
    }
    const response = await api.get<Drive[]>(url); 
    return response.data;
  },

  getDriveRequests: async () => {
    const response = await api.get<DriveRequest[]>(API_ROUTES.DRIVE_REQUESTS);
    return response.data;
  },

  updateDriveRequestStatus: async (driveId: number, studentId: number, status: string, remarks: string) => {
    const response = await api.put(`${API_ROUTES.ADMIN}/applications/status`, { 
        drive_id: driveId, 
        student_id: studentId, 
        status,
        remarks
    });
    return response.data;
  },

  bulkUpdateDriveRequestStatus: async (requests: { drive_id: number; student_id: number }[], status: string, remarks: string) => {
    const response = await api.put(`${API_ROUTES.ADMIN}/applications/bulk-status`, { 
        requests,
        status,
        remarks
    });
    return response.data;
  },
  
  // Admin specific fetch
  getAdminDrives: async () => {
    const response = await api.get<Drive[]>(API_ROUTES.ADMIN_DRIVES);
    return response.data;
  },

  createDrive: async (data: CreateDriveInput | FormData, onProgress?: (progress: number) => void) => {
    const isFormData = data instanceof FormData;
    const config = {
      headers: isFormData ? { "Content-Type": undefined } : undefined,
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    };
    
    // @ts-ignore
    const response = await api.post(API_ROUTES.ADMIN_DRIVES, data, config);
    return response.data;
  },

  updateDrive: async (id: number, data: Partial<Drive> | FormData) => {
    const isFormData = data instanceof FormData;
    const config = {
      headers: isFormData ? { "Content-Type": undefined } : undefined
    };
    // @ts-ignore
    const response = await api.put(`${API_ROUTES.ADMIN_DRIVES}/${id}`, data, config);
    return response.data;
  },

  deleteDrive: async (id: number) => {
    const response = await api.delete(`${API_ROUTES.ADMIN_DRIVES}/${id}`);
    return response.data;
  },

  bulkDeleteDrives: async (ids: number[]) => {
    const response = await api.post(`${API_ROUTES.ADMIN_DRIVES}/bulk-delete`, { ids });
    return response.data;
  },

  getDriveById: async (id: number) => {
    const response = await api.get<Drive>(`${API_ROUTES.ADMIN_DRIVES}`); // We fetch all and find locally or fetch one if endpoint exists
    // Ideally backend should have GET /drives/:id, it does exist in repo but maybe not exposed for Admin directly?
    // DriveRepo has GetDriveByID. Handler doesn't seem to have a dedicated GetDriveById for Admin? 
    // Ah, ListAdminDrives lists all. But `UpdateDrive` uses ID.
    // Let's check routes. 
    // `admin.Get("/drives/:id/applicants")` exists.
    // `admin.Get("/drives")` exists.
    // We don't have `admin.Get("/drives/:id")`. 
    // But we can use the Student one `/v1/drives` for details if we want, OR just filter from list.
    // For now, let's implement a filtered fetch from list as a fallback or add the endpoint.
    // Actually, good practice is to add the endpoint. But I didn't plan it.
    // Let's use the list fetch for now as I did in the key file.
    // Wait, I can just use `getAdminDrives` and find it. 
    // BUT the service method name `getDriveById` is useful.
    const drives = await driveService.getAdminDrives();
    return drives.find(d => d.id === id);
  },

  applyForDrive: async (driveId: number) => {
    const response = await api.post(`${API_ROUTES.DRIVES}/${driveId}/apply`);
    return response.data;
  },

  manualRegisterStudent: async (driveId: number, registerNumber: string) => {
    const response = await api.post(`${API_ROUTES.ADMIN_DRIVES}/${driveId}/add-student`, { register_number: registerNumber });
    return response.data;
  },

  getDriveApplicants: async (driveId: number) => {
    const response = await api.get(`${API_ROUTES.ADMIN_DRIVES}/${driveId}/applicants`);
    return response.data;
  },

  updateApplicationStatus: async (driveId: number, studentId: number, status: string) => {
    const response = await api.put(`${API_ROUTES.ADMIN}/applications/status`, { 
        drive_id: driveId, 
        student_id: studentId, 
        status 
    });
    return response.data;
  },

  getDriveApplicantsDetailed: async (driveId: number) => {
    const response = await api.get<DriveApplicantDetailed[]>(`${API_ROUTES.ADMIN_DRIVES}/${driveId}/applicants/detailed`);
    return response.data || [];
  },

  exportDriveApplicants: async (driveId: number, studentIds?: number[]) => {
    const response = await api.post<DriveApplicantDetailed[]>(`${API_ROUTES.ADMIN_DRIVES}/${driveId}/export`, { student_ids: studentIds });
    return response.data;
  },

  getBrandDetails: async (domain: string) => {
    // Fix: Add /v1 prefix
    const response = await api.get(`/v1/brands/${domain}`);
    return response.data;
  },

  searchCompany: async (query: string) => {
    const response = await api.get(`/v1/brands/search?query=${query}`);
    return response.data;
  },

  getStudentDocumentUrl: async (studentId: number, type: 'resume' | 'aadhar' | 'pan' | 'profile_photo') => {
    const response = await api.get(`/v1/admin/students/${studentId}/documents/${type}`);
    return response.data;
  }
};
