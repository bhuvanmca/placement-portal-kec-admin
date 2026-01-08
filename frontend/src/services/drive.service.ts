import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface Drive {
  id: number;
  company_name: string;
  job_role: string;
  drive_date: string;
  deadline_date: string;
  status: 'open' | 'closed' | 'completed' | 'cancelled' | 'on_hold';
  location: string;
  ctc_display: string;
}

export const driveService = {
  getAllDrives: async () => {
    const response = await api.get<Drive[]>(API_ROUTES.DRIVES); 
    // Assuming API_ROUTES.DRIVES maps to '/drives' which returns user specific or admin all drives
    // Ideally admin route might be different like '/admin/drives'
    return response.data;
  },
  
  // Admin specific fetch if needed
  // Admin specific fetch if needed
  getAdminDrives: async () => {
    // Both admin and students likely use the same list endpoint, potentially with different query params or token claims handling visibility
    const response = await api.get<Drive[]>(API_ROUTES.DRIVES);
    return response.data;
  },

  createDrive: async (data: Partial<Drive>) => {
    const response = await api.post(API_ROUTES.ADMIN_DRIVES, data);
    return response.data;
  },

  updateDrive: async (id: number, data: Partial<Drive>) => {
    const response = await api.put(`${API_ROUTES.ADMIN_DRIVES}/${id}`, data);
    return response.data;
  },

  deleteDrive: async (id: number) => {
    const response = await api.delete(`${API_ROUTES.ADMIN_DRIVES}/${id}`);
    return response.data;
  },

  applyForDrive: async (driveId: number) => {
    const response = await api.post(`${API_ROUTES.DRIVES}/${driveId}/apply`);
    return response.data;
  },

  manualRegisterStudent: async (driveId: number, studentId: number) => {
    const response = await api.post(`${API_ROUTES.ADMIN_DRIVES}/${driveId}/add-student`, { student_id: studentId });
    return response.data;
  }
};
