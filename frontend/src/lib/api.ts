import axios from 'axios';
import { APP_CONFIG } from '@/constants/config';

const api = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Log the request for debugging
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    
    // Add Authorization header if token exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

import { toast } from 'sonner';

// ... (keep existing imports and request interceptor)

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // Use console.warn instead of console.error to avoid triggering Next.js error overlay
    console.warn('[API Response Warning]', error.response?.status, error.response?.data);
    
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error || error.response?.data?.message;

    if (status === 401 || status === 403) {
      // For auth errors, show a clean "Invalid credentials" message
      toast.error('Invalid credentials');
    } else if (status === 500) {
      toast.error('Internal Server Error. Please try again later.');
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('Network Error. Please check your connection.');
    } else {
      toast.error(errorMessage || 'An error occurred');
    }

    // Return a resolved promise with error info to prevent unhandled rejection
    // The calling code should check for this pattern
    return Promise.reject({ handled: true, status, message: errorMessage });
  }
);

export default api;
