import apiClient from '@/lib/api';

export interface EligibilityTemplate {
  id: number;
  name: string;
  min_cgpa: number;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  ug_min_cgpa: number | null;
  pg_min_cgpa: number | null;
  use_aggregate: boolean;
  aggregate_percentage: number | null;
  max_backlogs_allowed: number;
  eligible_departments: string[];
  eligible_batches: number[];
  eligible_gender: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEligibilityTemplateInput {
  name: string;
  min_cgpa: number;
  tenth_percentage?: number | null;
  twelfth_percentage?: number | null;
  ug_min_cgpa?: number | null;
  pg_min_cgpa?: number | null;
  use_aggregate: boolean;
  aggregate_percentage?: number | null;
  max_backlogs_allowed: number;
  eligible_departments: string[];
  eligible_batches: number[];
  eligible_gender: string;
}

export const eligibilityService = {
  async getTemplates(): Promise<EligibilityTemplate[]> {
    const { data } = await apiClient.get('/v1/admin/eligibility-templates/');
    return data || [];
  },

  async getTemplate(id: number): Promise<EligibilityTemplate> {
    const { data } = await apiClient.get(`/v1/admin/eligibility-templates/${id}`);
    return data;
  },

  async createTemplate(input: CreateEligibilityTemplateInput): Promise<void> {
    await apiClient.post('/v1/admin/eligibility-templates/', input);
  },

  async updateTemplate(id: number, input: CreateEligibilityTemplateInput): Promise<void> {
    await apiClient.put(`/v1/admin/eligibility-templates/${id}`, input);
  },

  async deleteTemplate(id: number): Promise<void> {
    await apiClient.delete(`/v1/admin/eligibility-templates/${id}`);
  },
};
