import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface FieldPermission {
  field_name: string;
  label: string;
  is_enabled: boolean;
  category: string;
}

export interface StudentChangeRequest {
  id: number;
  student_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  student_name?: string;
  register_number?: string;
  field_label?: string;
}

export const settingsService = {
  // Get all field permissions
  getPermissions: async () => {
    const response = await api.get<FieldPermission[]>(API_ROUTES.SETTINGS.FIELDS);
    return response.data;
  },

  // Toggle permission
  togglePermission: async (fieldName: string, isEnabled: boolean) => {
    const response = await api.put(`${API_ROUTES.SETTINGS.FIELDS}/${fieldName}`, { 
      is_enabled: isEnabled 
    });
    return response.data;
  },

  // Get pending change requests
  getPendingRequests: async () => {
    const response = await api.get<StudentChangeRequest[]>(API_ROUTES.SETTINGS.REQUESTS);
    return response.data;
  },

  // Handle request (approve/reject)
  handleRequest: async (id: number, action: 'approve' | 'reject') => {
    const response = await api.post(`${API_ROUTES.SETTINGS.REQUESTS}/${id}?action=${action}`);
    return response.data;
  }
};
