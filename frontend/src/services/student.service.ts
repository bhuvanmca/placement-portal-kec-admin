import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export const studentService = {
  getAllStudents: async (params?: { dept?: string; batch?: number; search?: string }) => {
    const response = await api.get(API_ROUTES.ADMIN_STUDENTS, { params });
    return response.data;
  },

  deleteStudent: async (id: number) => {
    const response = await api.delete(`${API_ROUTES.ADMIN_STUDENTS}/${id}`);
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
};
