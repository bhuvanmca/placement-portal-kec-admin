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
    console.error('[API Response Error]', error.response?.status, error.response?.data);
    
    if (error.response?.status === 500) {
      toast.error('Internal Server Error. Please try again later.');
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('Network Error. Please check your connection.');
    } else {
      toast.error(error.response?.data?.message || 'An error occurred');
    }

    return Promise.reject(error);
  }
);

export default api;
