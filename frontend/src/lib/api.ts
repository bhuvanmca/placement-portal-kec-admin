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
    // console.error('[API Request Error]', error);
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
    // console.warn('[API Response Warning]', error.response?.status, error.response?.data);
    
    // Check for Server Connection Issues
    const isNetworkError = error.code === 'ERR_NETWORK';
    const isServerDown = error.response?.status >= 502 && error.response?.status <= 504;
    const isConnectionRefused = error.response?.status === 0; // Sometimes happens with CORS/Network failure

    // Only trigger server down overlay if we are ONLINE (otherwise it's just no internet)
    if (typeof window !== 'undefined' && navigator.onLine) {
       if (isNetworkError || isServerDown || isConnectionRefused) {
         // Dispatch event to show ServerErrorOverlay
         window.dispatchEvent(
           new CustomEvent('server-availability-changed', {
             detail: { available: false },
           })
         );
         
         // Return rejected promise but handled
         // We might not want to show a toast ON TOP of the overlay
         return Promise.reject({ handled: true, isServerDown: true, message: 'Server unavailable' });
       }
    }

    const status = error.response?.status;
    const errorMessage = typeof error.response?.data?.error === 'string' ? error.response?.data?.error 
        : typeof error.response?.data?.message === 'string' ? error.response?.data?.message 
        : 'An error occurred';

    if (status === 401 || status === 403) {
      const isLoginUrl = error.config?.url?.includes('/login');
      if (isLoginUrl) {
        toast.error('Invalid credentials');
      } else if (status === 401 && !error.config?.url?.includes('/user/account')) {
        toast.error('Session expired. Please login again.');
      }
    } else if (status === 500) {
      toast.error('Internal Server Error. Please try again later.');
    } else {
      toast.error(errorMessage);
    }

    // Return a custom error object that behaves like an Error
    const customError = new Error(errorMessage);
    (customError as any).status = status;
    (customError as any).handled = true;
    
    return Promise.reject(customError);
  }
);

export default api;
