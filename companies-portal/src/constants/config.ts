export const APP_CONFIG = {
    NAME: 'KEC Companies Portal',
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
    DESCRIPTION: 'Company Management Portal - KEC Placement Cell',
};

export const API_ROUTES = {
    ADMIN_AUTH: {
        LOGIN: '/v1/admin/auth/login',
        REGISTER: '/v1/admin/auth/register',
        FORGOT_PASSWORD: '/v1/admin/auth/forgot-password',
        RESET_PASSWORD: '/v1/admin/auth/reset-password',
    },
    ADMIN_COMPANIES: '/v1/admin/companies',
};
