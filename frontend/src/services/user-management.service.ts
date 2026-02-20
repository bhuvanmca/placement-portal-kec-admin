import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface ManagedUser {
  id: number;
  email: string;
  role: 'admin' | 'coordinator';
  name: string | null;
  department_code: string | null;
  is_active: boolean;
  is_blocked: boolean;
  permissions: string[];
  created_at: string;
  last_login: string | null;
}

export interface PermissionKey {
  key: string;
  label: string;
  description: string;
}

export interface Department {
  code: string;
  name: string;
  type: string;
}

export interface ActivityLogEntry {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: 'admin' | 'coordinator';
  name?: string;
  department_code?: string;
  permissions?: string[];
}

export interface UpdateUserInput {
  name?: string;
  role: 'admin' | 'coordinator';
  department_code?: string;
  is_active: boolean;
  permissions?: string[];
}

class UserManagementService {
  async listUsers(search: string = '', role: string = ''): Promise<ManagedUser[]> {
    const res = await api.get(`${API_ROUTES.SUPER_ADMIN.USERS}?search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`);
    return res.data;
  }

  async createUser(input: CreateUserInput): Promise<{ success: boolean; user_id: number }> {
    const res = await api.post(API_ROUTES.SUPER_ADMIN.USERS, input);
    return res.data;
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<{ success: boolean }> {
    const res = await api.put(`${API_ROUTES.SUPER_ADMIN.USERS}/${id}`, input);
    return res.data;
  }

  async deleteUser(id: number): Promise<{ success: boolean }> {
    const res = await api.delete(`${API_ROUTES.SUPER_ADMIN.USERS}/${id}`);
    return res.data;
  }

  async getUserPermissions(id: number): Promise<string[]> {
    const res = await api.get(`${API_ROUTES.SUPER_ADMIN.USERS}/${id}/permissions`);
    return res.data.permissions;
  }

  async updateUserPermissions(id: number, permissions: string[]): Promise<{ success: boolean }> {
    const res = await api.put(`${API_ROUTES.SUPER_ADMIN.USERS}/${id}/permissions`, { permissions });
    return res.data;
  }

  async getAllPermissionKeys(): Promise<PermissionKey[]> {
    const res = await api.get(API_ROUTES.SUPER_ADMIN.PERMISSIONS);
    return res.data.permissions;
  }

  async getDepartments(): Promise<Department[]> {
    const res = await api.get(API_ROUTES.SUPER_ADMIN.DEPARTMENTS);
    return res.data;
  }

  async getActivityLog(limit = 50, offset = 0): Promise<{ entries: ActivityLogEntry[]; total: number }> {
    const res = await api.get(API_ROUTES.SUPER_ADMIN.ACTIVITY_LOG, { params: { limit, offset } });
    return res.data;
  }
}

export const userManagementService = new UserManagementService();
