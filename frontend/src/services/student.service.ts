import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface Student {
  id: number;
  email: string;
  full_name: string;
  register_number: string;
  department: string;
  batch_year: number;
  mobile: string;
  is_blocked: boolean;
  // Optional fields that might be added later or computed
  profile_status?: string;
  student_type?: string;
  cgpa?: number;
  backlogs?: number;
  profile_photo_url?: string;
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
  page?: number;
  limit?: number;
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
};
