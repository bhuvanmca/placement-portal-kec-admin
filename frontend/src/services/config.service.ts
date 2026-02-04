import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface Department {
  id: number;
  name: string;
  code: string;
  type: 'UG' | 'PG' | 'PhD';
  is_active: boolean;
}

export interface Batch {
  id: number;
  year: number;
  is_active: boolean;
}

export const configService = {
  // Departments
  getAllDepartments: async () => {
    const response = await api.get<Department[]>(API_ROUTES.CONFIG.DEPARTMENTS);
    return response.data;
  },

  addDepartment: async (data: Omit<Department, 'id' | 'is_active'>) => {
    const response = await api.post(API_ROUTES.CONFIG.ADMIN_DEPARTMENTS, data);
    return response.data;
  },

  updateDepartment: async (id: number, data: Omit<Department, 'id' | 'is_active'>) => {
    const response = await api.put(`${API_ROUTES.CONFIG.ADMIN_DEPARTMENTS}/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id: number) => {
    const response = await api.delete(`${API_ROUTES.CONFIG.ADMIN_DEPARTMENTS}/${id}`);
    return response.data;
  },

  // Batches
  getAllBatches: async () => {
    const response = await api.get<Batch[]>(API_ROUTES.CONFIG.BATCHES);
    return response.data;
  },

  addBatch: async (year: number) => {
    const response = await api.post(API_ROUTES.CONFIG.ADMIN_BATCHES, { year });
    return response.data;
  },

  updateBatch: async (id: number, year: number) => {
    const response = await api.put(`${API_ROUTES.CONFIG.ADMIN_BATCHES}/${id}`, { year });
    return response.data;
  },

  deleteBatch: async (id: number) => {
    const response = await api.delete(`${API_ROUTES.CONFIG.ADMIN_BATCHES}/${id}`);
    return response.data;
  },
};
