import api from "@/lib/api";

export interface Spoc {
    id: number;
    name: string;
    designation: string;
    mobile_number: string;
    email: string;
    is_active: boolean;
    created_at?: string;
}

export interface CreateSpocInput {
    name: string;
    designation: string;
    mobile_number: string;
    email: string;
}

export const spocService = {
  getAllSpocs: async () => {
    const response = await api.get<Spoc[]>('/v1/spocs');
    return response.data;
  },

  createSpoc: async (data: CreateSpocInput) => {
    const response = await api.post<Spoc>('/v1/admin/spocs', data);
    return response.data;
  },

  updateSpoc: async (id: number, data: Partial<CreateSpocInput>) => {
    const response = await api.put<Spoc>(`/v1/admin/spocs/${id}`, data);
    return response.data;
  },

  deleteSpoc: async (id: number) => {
    await api.delete(`/v1/admin/spocs/${id}`);
  },

  toggleSpocStatus: async (id: number, isActive: boolean) => {
    const response = await api.put<Spoc>(`/v1/admin/spocs/${id}/status`, { is_active: isActive });
    return response.data;
  }
};
