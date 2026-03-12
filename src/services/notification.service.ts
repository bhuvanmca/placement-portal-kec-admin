import { apiClient } from '../lib/api/client';

export interface Notification {
  id: string;
  title: string;
  body: string;
  sentTime: string;
  isRead: boolean;
}

export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    const { data } = await apiClient.get('/v1/student/notifications');
    return Array.isArray(data) ? data : [];
  }

  static async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/v1/student/notifications/${id}/read`);
  }

  static async clearAll(): Promise<void> {
    await apiClient.delete('/v1/student/notifications');
  }

  static async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/v1/student/notifications/${id}`);
  }
}
