export const APP_CONFIG = {
  NAME: 'KEC Placement Portal',
  API_BASE_URL: 'http://localhost:8080/api',
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
  BULK_UPLOAD_STUDENTS: '/v1/admin/students/bulk-upload',
  ADMIN: '/v1/admin',
};
