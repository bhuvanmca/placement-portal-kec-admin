import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export interface CompanyChecklist {
    approved: boolean;
    cab: boolean;
    accommodation: boolean;
    rounds: boolean;
    qp_printout: boolean;
}

export interface Company {
    id: number;
    name: string;
    visit_date: string;
    incharge: string;
    eligible_departments: string;
    salary: string;
    eligibility: string;
    remarks: string;
    checklist: CompanyChecklist;
    created_at: string;
    updated_at: string;
}

export interface CreateCompanyInput {
    name: string;
    visit_date: string; // YYYY-MM-DD
    incharge: string;
    eligible_departments: string;
    salary: string;
    eligibility: string;
    remarks: string;
}

export const companyService = {
    getAllCompanies: async () => {
        const response = await api.get<Company[]>(API_ROUTES.ADMIN_COMPANIES);
        return response.data;
    },

    createCompany: async (data: CreateCompanyInput) => {
        const response = await api.post<Company>(API_ROUTES.ADMIN_COMPANIES, data);
        return response.data;
    },

    updateCompany: async (id: number, data: CreateCompanyInput) => {
        const response = await api.put(`${API_ROUTES.ADMIN_COMPANIES}/${id}`, data);
        return response.data;
    },

    updateChecklist: async (id: number, checklist: CompanyChecklist) => {
        const response = await api.put(`${API_ROUTES.ADMIN_COMPANIES}/${id}/checklist`, { checklist });
        return response.data;
    },

    deleteCompany: async (id: number) => {
        const response = await api.delete(`${API_ROUTES.ADMIN_COMPANIES}/${id}`);
        return response.data;
    }
};
