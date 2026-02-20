import apiClient from '@/lib/api';

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

export interface ActivityLogResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
}

// Assuming ManagedUser interface is defined elsewhere or needs to be added.
// For the purpose of this edit, we'll assume it's available or will be added.
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  // Add other properties of a ManagedUser as needed
}

export const ActivityLogService = {
  getLogs: async (page = 1, limit = 20, sortBy: string = 'created_at', sortOrder: 'ASC' | 'DESC' = 'DESC') => {
    const { data } = await apiClient.get<ActivityLogResponse>(`/v1/super-admin/activity-log?page=${page}&limit=${limit}&sort_by=${sortBy}&sort_order=${sortOrder}`);
    return data;
  },
};
