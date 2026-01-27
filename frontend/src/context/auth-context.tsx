'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, LoginCredentials, AuthResponse } from '@/types/auth'; // Centralized types
import { API_ROUTES } from '@/constants/config';
import { APP_ROUTES as PAGE_ROUTES } from '@/constants/routes'; 
import { isTokenExpired } from '@/utils/auth';
import { toast } from 'sonner'; 

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginCredentials, type?: 'admin' | 'student') => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      console.log("[AuthProvider] Initializing auth...");
      const token = localStorage.getItem('token');
      if (token) {
        if (isTokenExpired(token)) {
            console.log("[AuthProvider] Token expired, logging out.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
            toast.error("Session expired. Please login again.");
            router.push(PAGE_ROUTES.LOGIN);
        } else {
            console.log("[AuthProvider] Found valid token, setting authenticated state.");
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                 setUser(JSON.parse(storedUser));
            }
            setIsAuthenticated(true);
            // Optionally redirect to dashboard if on public page? 
            // Better to handle that in the pages themselves or middleware.
        }
      } else {
        console.log("[AuthProvider] No token found.");
        setIsAuthenticated(false); // Ensure explicitly false
      }
      setIsLoading(false);
    };
    initAuth();
  }, [router]);

  const login = async (data: LoginCredentials, type: 'admin' | 'student' = 'admin'): Promise<boolean> => {
    // For this admin portal, we default to 'admin' but keep flexibility if ever needed, or just force admin.
    // The UI now strictly calls with 'admin' anyway, but defaulting here is safe.
    console.log(`[AuthProvider] ${type} Login called with:`, data);
    try {
      const endpoint = type === 'admin' ? API_ROUTES.ADMIN_AUTH.LOGIN : API_ROUTES.STUDENT_AUTH.LOGIN;
      const response = await api.post(endpoint, data); 
      console.log("[AuthProvider] Login response:", response);

      const responseData = response.data;
      
      const token = responseData.token;
      
      if (token) {
        console.log("[AuthProvider] Token received:", token);

        // Double check role on client side just in case (though backend handles it now)
        if (type === 'admin' && responseData.role !== 'admin') {
           toast.error("Unauthorized access. Admin credentials required.");
           return false;
        }

        localStorage.setItem('token', token);
        
        const userData: User = {
          email: responseData.email,
          role: responseData.role,
          name: responseData.email.split('@')[0]
        };

        console.log("[AuthProvider] User data derived:", userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        router.push(PAGE_ROUTES.DASHBOARD);
        return true;
      } else {
        console.error("[AuthProvider] Login successful but no token found in response:", responseData);
        toast.error("Login failed. No token received.");
        return false;
      }
    } catch (error: any) {
       console.warn("[AuthProvider] Login handled:", error?.message || 'Auth error');
       // Error is already handled by interceptor toast
       return false;
    }
  };

  const logout = () => {
    console.log("[AuthProvider] Logout called");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    router.push(PAGE_ROUTES.LOGIN);
  };

  const value = React.useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  }), [user, isAuthenticated, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
