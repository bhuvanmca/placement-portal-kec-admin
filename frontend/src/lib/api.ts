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

import { toast } from 'sonner';

// Server availability tracking — requires consecutive failures to avoid false positives
let serverDownFired = false;
let consecutiveFailures = 0;
let lastFailureTime = 0;
let lastServerDownEventTime = 0;

const SERVER_DOWN_THRESHOLD = 3;       // consecutive failures before showing overlay
const FAILURE_WINDOW_MS = 30_000;      // failures must occur within 30s to count
const COOLDOWN_MS = 120_000;           // 2 min cooldown between server-down events

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    // Successful response — reset failure tracking and recover if needed
    consecutiveFailures = 0;
    if (serverDownFired) {
      serverDownFired = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('server-availability-changed', {
            detail: { available: true },
          })
        );
      }
    }
    return response;
  },
  (error) => {
    const isNetworkError = error.code === 'ERR_NETWORK';
    const isServerDown = error.response?.status >= 502 && error.response?.status <= 504;
    const isConnectionRefused = error.response?.status === 0;

    if (typeof window !== 'undefined' && navigator.onLine) {
       if (isNetworkError || isServerDown || isConnectionRefused) {
         const now = Date.now();

         // Reset counter if failures are too spread apart
         if (now - lastFailureTime > FAILURE_WINDOW_MS) {
           consecutiveFailures = 0;
         }
         consecutiveFailures++;
         lastFailureTime = now;

         // Only fire event after threshold AND respecting cooldown
         if (
           consecutiveFailures >= SERVER_DOWN_THRESHOLD &&
           !serverDownFired &&
           now - lastServerDownEventTime > COOLDOWN_MS
         ) {
           serverDownFired = true;
           lastServerDownEventTime = now;
           window.dispatchEvent(
             new CustomEvent('server-availability-changed', {
               detail: { available: false },
             })
           );
         }
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
