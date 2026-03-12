import { apiClient } from '../lib/api/client';
import { StudentProfile, ChangeRequest, DriveRequest } from '../types';

export class StudentService {
  static async getProfile(): Promise<StudentProfile> {
    const { data } = await apiClient.get('/v1/student/profile');
    return data;
  }

  static async updateProfile(profileData: Partial<StudentProfile>): Promise<StudentProfile> {
    const { data } = await apiClient.put('/v1/student/profile', profileData);
    return data;
  }

  static async uploadFile(file: File, docType: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`/v1/student/upload?type=${docType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.url;
  }

  static async getDocumentURL(documentType: string): Promise<string> {
    const { data } = await apiClient.get(`/v1/student/documents/${documentType}`);
    return data.url;
  }

  static async changePassword(passwordData: any): Promise<void> {
    await apiClient.put('/v1/student/password', passwordData);
  }

  static async getRequests(): Promise<ChangeRequest[]> {
    const { data } = await apiClient.get('/v1/student/requests');
    return Array.isArray(data) ? data : [];
  }

  static async getDriveRequests(): Promise<DriveRequest[]> {
    const { data } = await apiClient.get('/v1/student/drive-requests');
    return Array.isArray(data) ? data : [];
  }

  static async deleteChangeRequest(requestId: number): Promise<void> {
    await apiClient.delete(`/v1/student/requests/${requestId}`);
  }

  static async deleteDriveRequest(driveId: number): Promise<void> {
    await apiClient.delete(`/v1/student/drive-requests/${driveId}`);
  }

  static async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/v1/auth/forgot-password', { email });
  }

  static async resetPassword(resetData: any): Promise<void> {
    await apiClient.post('/v1/auth/reset-password', resetData);
  }
}
