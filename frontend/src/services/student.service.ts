import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface Student {
  id: number;
  email: string;
  is_blocked: boolean;
  last_login?: string;
  
  // Personal
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  father_name?: string;
  mother_name?: string;
  register_number: string;
  department: string;
  department_type?: string;
  batch_year: number;
  student_type?: string;
  placement_willingness?: string;
  mobile_number?: string; // mobile_number in backend
  gender?: string;
  dob?: string;
  
  // Address
  address_line_1?: string;
  address_line_2?: string;
  state?: string;

  // Identity
  pan_number?: string;
  aadhar_number?: string;

  // Academics
  tenth_mark?: number;
  tenth_board?: string;
  tenth_year_pass?: number;
  tenth_institution?: string;

  twelfth_mark?: number;
  twelfth_board?: string;
  twelfth_year_pass?: number;
  twelfth_institution?: string;

  diploma_mark?: number;
  diploma_year_pass?: number;
  diploma_institution?: string;

  // Degrees
  ug_cgpa?: number; // from 'ug_cgpa'
  pg_cgpa?: number;

  ug_year_pass?: number;
  ug_institution?: string;
  pg_year_pass?: number;
  pg_institution?: string;

  current_backlogs?: number;
  history_of_backlogs?: number;
  gap_years?: number;
  gap_reason?: string;

  // Documents
  resume_url?: string;
  profile_photo_url?: string;
  aadhar_card_url?: string;
  pan_card_url?: string;
  resume_updated_at?: string;

  // Computed / Extra
  profile_status?: string;
  placement_stats?: {
    eligible_drives: number;
    opted_in: number;
    opted_out: number;
    attended: number;
    offers_received: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface StudentParams {
  dept?: string;
  batch?: number;
  search?: string;
  searchType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export const studentService = {
  getAllStudents: async (params?: StudentParams) => {
    const response = await api.get<PaginatedResponse<Student>>(API_ROUTES.ADMIN_STUDENTS, { params });
    return response.data; // This now returns { data: [], meta: {} }
  },

  getStudentDetails: async (id: string | number) => {
    const response = await api.get(`${API_ROUTES.ADMIN_STUDENTS}/${id}`);
    return response.data;
  },

  deleteStudent: async (id: number) => {
    const response = await api.delete(`${API_ROUTES.ADMIN_STUDENTS}/${id}`);
    return response.data;
  },

  bulkDeleteStudents: async (ids: number[]) => {
    const response = await api.post(`${API_ROUTES.ADMIN_STUDENTS}/delete-many`, { ids });
    return response.data;
  },

  bulkUploadStudents: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(API_ROUTES.BULK_UPLOAD_STUDENTS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  createStudent: async (data: any) => {
    const response = await api.post(API_ROUTES.ADMIN_STUDENTS, data);
    return response.data;
  },

  toggleBlockStatus: async (studentId: number, block: boolean) => {
    const response = await api.put(`${API_ROUTES.ADMIN_USERS}/${studentId}/block`, { block });
    return response.data;
  },

  getStudentDocumentUrl: async (studentId: string | number, type: 'resume' | 'profile_photo' | 'aadhar' | 'pan') => {
      const response = await api.get(`${API_ROUTES.ADMIN_STUDENTS}/${studentId}/documents/${type}`);
      return response.data;
  },
};
