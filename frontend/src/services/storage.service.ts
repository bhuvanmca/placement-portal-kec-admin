import api from '@/lib/api';

export interface GarageObject {
  key: string;
  size: number;
  last_modified: string;
  size_human: string;
}

export interface GarageStats {
  total_objects: number;
  total_size: number;
  total_size_human_readable: string;
  bucket_name: string;
}

export interface ListObjectsResponse {
  objects: GarageObject[];
  stats: GarageStats;
  count: number;
}

export interface ObjectInfoResponse {
  key: string;
  size: number;
  size_human: string;
  content_type: string;
  last_modified: string;
  download_url: string;
  expires_in: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  key: string;
}

export interface BulkDeleteResponse {
  success: boolean;
  deleted_count: number;
  failed_count: number;
  errors: string[];
}

export interface SystemStorageInfo {
  total_capacity_gb: number;
  used_gb: number;
  available_gb: number;
  used_percent: number;
  alert_threshold_percent: number;
  is_low_storage: boolean;
  root_disk_usage: string;
  docker_volumes: Array<{ name: string; size: string }>;
  docker_error?: string; // [NEW]
  garage_stats?: GarageStats;
}

class StorageService {
  /**
   * Get system storage info (Disk usage & Docker volumes)
   */
  async getSystemStorageInfo(): Promise<SystemStorageInfo> {
    const response = await api.get<SystemStorageInfo>('/v1/admin/system/storage');
    return response.data;
  }

  /**
   * List all objects in Garage bucket
   */
  async listObjects(prefix?: string, bucket?: string): Promise<ListObjectsResponse> {
    const params: Record<string, string> = {};
    if (prefix) params.prefix = prefix;
    if (bucket) params.bucket = bucket;
    const response = await api.get<ListObjectsResponse>('/v1/admin/storage/objects', { params });
    return response.data;
  }

  /**
   * List chat bucket objects filtered by group IDs
   */
  async listChatObjects(groupIds: number[]): Promise<ListObjectsResponse> {
    const response = await api.get<ListObjectsResponse>('/v1/admin/storage/chat-objects', {
      params: { group_ids: groupIds.join(',') }
    });
    return response.data;
  }

  /**
   * Get object metadata and presigned download URL
   */
  async getObjectInfo(key: string, bucket?: string): Promise<ObjectInfoResponse> {
    const params: Record<string, string> = { key };
    if (bucket) params.bucket = bucket;
    const response = await api.get<ObjectInfoResponse>('/v1/admin/storage/object', {
      params
    });
    return response.data;
  }

  /**
   * Download a file directly
   */
  async downloadObject(key: string, bucket?: string): Promise<Blob> {
    const params: Record<string, string> = { key };
    if (bucket) params.bucket = bucket;
    const response = await api.get('/v1/admin/storage/download', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Delete a single object
   */
  async deleteObject(key: string, bucket?: string): Promise<DeleteResponse> {
    const params: Record<string, string> = {};
    if (bucket) params.bucket = bucket;
    const response = await api.delete<DeleteResponse>('/v1/admin/storage/object', {
      params,
      data: { key }
    });
    return response.data;
  }

  /**
   * Delete multiple objects
   */
  async bulkDeleteObjects(keys: string[], bucket?: string): Promise<BulkDeleteResponse> {
    const params: Record<string, string> = {};
    if (bucket) params.bucket = bucket;
    const response = await api.post<BulkDeleteResponse>('/v1/admin/storage/bulk-delete', {
      keys
    }, { params });
    return response.data;
  }

  /**
   * Helper: Trigger browser download for a file
   */
  async triggerDownload(key: string, bucket?: string): Promise<void> {
    const blob = await this.downloadObject(key, bucket);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = key.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export const storageService = new StorageService();
