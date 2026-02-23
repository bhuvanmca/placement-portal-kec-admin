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

export interface DriveApplicantDetailed {
  id: number;
  email: string;
  full_name: string;
  register_number: string;
  department: string;
  department_type: string;
  batch_year: number;
  student_type: string;
  placement_willingness: string;
  mobile_number: string;
  gender: string;
  tenth_mark: number;
  twelfth_mark: number;
  diploma_mark: number;
  current_backlogs: number;
  history_of_backlogs: number;
  ug_cgpa: number;
  pg_cgpa: number;
  profile_photo_url: string;
  status?: string;
  applied_at?: string;
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
