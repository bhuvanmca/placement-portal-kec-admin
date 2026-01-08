export const APP_CONFIG = {
  NAME: 'KEC Placement Portal',
  API_BASE_URL: 'http://localhost:8080/api',
  DESCRIPTION: 'Placement Portal Admin Dashboard',
};

export const API_ROUTES = {
  LOGIN: '/auth/login',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  ME: '/auth/me',
  DRIVES: '/v1/drives',
  ADMIN_DRIVES: '/v1/admin/drives',
  ADMIN_STUDENTS: '/v1/admin/students',
  BULK_UPLOAD_STUDENTS: '/v1/admin/students/bulk-upload',
};
