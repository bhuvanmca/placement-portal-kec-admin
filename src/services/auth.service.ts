import { apiClient } from '../lib/api/client';
import { LoginResponse } from '../types';

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/v1/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('is_profile_complete', JSON.stringify(data.is_profile_complete || false));
    }
    return data;
  }

  static async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/v1/auth/forgot-password', { email });
  }

  static async resetPassword(resetData: any): Promise<void> {
    await apiClient.post('/v1/auth/reset-password', resetData);
  }

  static async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('is_profile_complete');
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  static isProfileComplete(): boolean {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('is_profile_complete');
      return val ? JSON.parse(val) : false;
    }
    return false;
  }
}
