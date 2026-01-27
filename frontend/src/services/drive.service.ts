import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface Round {
  name: string;
  date: string;
  description: string;
}

export interface Drive {
  id: number;
  company_name: string;
  job_role: string;
  job_description: string;
  location: string;
  website?: string;
  logo_url?: string;
  drive_type: string;
  company_category: string;
  spoc_id: number;
  ctc_min: number;
  ctc_max: number;
  ctc_display: string;
  min_cgpa: number;
  max_backlogs_allowed: number;
  eligible_batches: number[];
  eligible_departments: string[];
  eligible_gender: string;
  rounds: Round[];
  drive_date: string;
  deadline_date: string;
  status: string;
  applicant_count?: number; // [NEW] Added for dashboard
}

export interface CreateDriveInput {
  company_name: string;
  job_role: string;
  job_description: string;
  location: string;
  website?: string;
  logo_url?: string;
  drive_type: string;
  company_category: string;
  spoc_id: number; // Single Point Of Contact
  ctc_min: number;
  ctc_max: number;
  ctc_display: string;
  min_cgpa: number;
  max_backlogs_allowed: number;
  eligible_batches: number[];
  eligible_departments: string[];
  eligible_gender: string;
  rounds: Round[];
  drive_date: string;
  deadline_date: string;
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

  manualRegisterStudent: async (driveId: number, studentId: number) => {
    const response = await api.post(`${API_ROUTES.ADMIN_DRIVES}/${driveId}/add-student`, { student_id: studentId });
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
