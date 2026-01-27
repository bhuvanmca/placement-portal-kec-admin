import api from '@/lib/api';
import { API_ROUTES } from '@/constants/config';

export const authService = {
  forgotPassword: async (email: string) => {
    const response = await api.post(API_ROUTES.ADMIN_AUTH.FORGOT_PASSWORD, { email });
    return response.data;
  },

  resetPassword: async (data: any) => {
    const response = await api.post(API_ROUTES.ADMIN_AUTH.RESET_PASSWORD, data);
    return response.data;
  },
};
