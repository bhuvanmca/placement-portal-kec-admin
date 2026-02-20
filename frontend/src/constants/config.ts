export const APP_CONFIG = {
  NAME: 'KEC Placement Portal',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  DESCRIPTION: 'Placement Portal Admin Dashboard',
};

export const API_ROUTES = {
  ADMIN_AUTH: {
    LOGIN: '/v1/admin/auth/login',
    REGISTER: '/v1/admin/auth/register',
    FORGOT_PASSWORD: '/v1/admin/auth/forgot-password',
    RESET_PASSWORD: '/v1/admin/auth/reset-password',
  },
  STUDENT_AUTH: {
    LOGIN: '/v1/auth/login',
  },
  ME: '/auth/me',
  DRIVES: '/v1/drives',
  ADMIN_DRIVES: '/v1/admin/drives',
  ADMIN_STUDENTS: '/v1/admin/students',
  ADMIN_USERS: '/v1/admin/users',
  DRIVE_REQUESTS: '/v1/admin/drive-requests',
  BULK_UPLOAD_STUDENTS: '/v1/admin/students/bulk-upload',
  ADMIN: '/v1/admin',
  CONFIG: {
    DEPARTMENTS: '/v1/config/departments',
    BATCHES: '/v1/config/batches',
    ADMIN_DEPARTMENTS: '/v1/admin/config/departments',
    ADMIN_BATCHES: '/v1/admin/config/batches'
  },
  SETTINGS: {
    FIELDS: '/v1/admin/settings/fields',
    REQUESTS: '/v1/admin/requests'
  },
  SUPER_ADMIN: {
    USERS: '/v1/super-admin/users',
    PERMISSIONS: '/v1/super-admin/permissions',
    ACTIVITY_LOG: '/v1/super-admin/activity-log',
    DEPARTMENTS: '/v1/super-admin/departments',
  }
};
