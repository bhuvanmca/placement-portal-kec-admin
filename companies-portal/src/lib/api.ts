import axios from 'axios';
import { APP_CONFIG } from '@/constants/config';
import { toast } from 'sonner';

const api = axios.create({
    baseURL: APP_CONFIG.API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');

        // Add Authorization header if token exists
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        // Check for Server Connection Issues
        const isNetworkError = error.code === 'ERR_NETWORK';
        const isServerDown = error.response?.status >= 502 && error.response?.status <= 504;
        const isConnectionRefused = error.response?.status === 0;

        if (typeof window !== 'undefined' && navigator.onLine) {
            if (isNetworkError || isServerDown || isConnectionRefused) {
                window.dispatchEvent(
                    new CustomEvent('server-availability-changed', {
                        detail: { available: false },
                    })
                );

                return Promise.reject({ handled: true, isServerDown: true, message: 'Server unavailable' });
            }
        }

        const status = error.response?.status;
        const errorMessage = error.response?.data?.error || error.response?.data?.message;

        if (status === 401 || status === 403) {
            toast.error('Invalid credentials');
        } else if (status === 500) {
            toast.error('Internal Server Error. Please try again later.');
        } else {
            toast.error(errorMessage || 'An error occurred');
        }

        return Promise.reject({ handled: true, status, message: errorMessage });
    }
);

export default api;
