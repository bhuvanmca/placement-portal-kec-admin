'use strict';

import { apiClient } from '../lib/api/client';
import { Drive } from '../types';

export class DriveService {
  static async getDrives(options: { page?: number; limit?: number; search?: string } = {}): Promise<{ drives: Drive[], total: number }> {
    const { page = 1, limit = 100, search = '' } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    
    const { data } = await apiClient.get(`/v1/drives?${params.toString()}`);
    return {
      drives: Array.isArray(data.drives) ? data.drives : [],
      total: data.total || 0
    };
  }

  static async getDriveById(id: number): Promise<Drive> {
    const { data } = await apiClient.get(`/v1/drives/${id}`);
    return data;
  }

  static async applyForDrive(id: number, roleIds?: number[]): Promise<void> {
    await apiClient.post(`/v1/drives/${id}/apply`, { role_ids: roleIds });
  }

  static async withdrawFromDrive(id: number, reason?: string): Promise<void> {
    await apiClient.post(`/v1/drives/${id}/withdraw`, { reason });
  }

  static async requestToAttend(id: number, roleIds?: number[]): Promise<void> {
    await apiClient.post(`/v1/drives/${id}/request-attend`, { role_ids: roleIds });
  }
}
