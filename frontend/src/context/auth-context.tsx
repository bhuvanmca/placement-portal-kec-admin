'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, LoginCredentials, AuthResponse } from '@/types/auth'; // Centralized types
import { API_ROUTES } from '@/constants/config';
import { APP_ROUTES as PAGE_ROUTES } from '@/constants/routes'; 
import { isTokenExpired } from '@/utils/auth';
import { toast } from 'sonner'; 

export interface CollegeSettings {
  college_name: string;
  college_logo_url: string;
}

export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginCredentials, type?: 'admin' | 'student') => Promise<boolean>;
  logout: () => void;
  collegeSettings: CollegeSettings;
  updateCollegeSettings: (settings: Partial<CollegeSettings>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [collegeSettings, setCollegeSettings] = useState<CollegeSettings>({
    college_name: '',
    college_logo_url: ''
  });
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      console.log("[AuthProvider] Initializing auth...");
      const token = localStorage.getItem('token');
      
      // Fetch college settings regardless of auth (public endpoint usually, or cached)
      // But actually /v1/settings is public.
      try {
        const { data } = await api.get('/v1/settings');
        if (data.settings) {
            setCollegeSettings({
                college_name: data.settings.college_name || '',
                college_logo_url: data.settings.college_logo_url || ''
            });
        }
      } catch (e) {
        console.log("[AuthProvider] Failed to fetch initial settings", e);
      }

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
            console.log("[AuthProvider] Found valid token, refreshing session...");
            // Optimistically set authenticated
            setIsAuthenticated(true);
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                 setUser(JSON.parse(storedUser));
            }
            
            // Fetch fresh user data (and presigned URL)
            try {
                const { data } = await api.get('/v1/user/account');
                const updatedUser: User = {
                    id: data.id,
                    email: data.email,
                    role: data.role,
                    name: data.name,
                    department_code: data.department_code,
                    permissions: data.permissions || [], 
                    profile_photo_url: data.profile_photo_url
                };

                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    if (parsed.permissions) {
                        updatedUser.permissions = parsed.permissions;
                    }
                }

                console.log("[AuthProvider] Session refreshed:", updatedUser);
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } catch (error) {
                console.error("[AuthProvider] Failed to refresh session:", error);
            }
        }
      } else {
        console.log("[AuthProvider] No token found.");
        setIsAuthenticated(false); 
      }
      setIsLoading(false);
    };
    initAuth();
  }, [router]);

  // Persist user state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user, isAuthenticated, isLoading]);

  const updateCollegeSettings = (settings: Partial<CollegeSettings>) => {
      setCollegeSettings(prev => ({ ...prev, ...settings }));
  };

  const login = async (data: LoginCredentials, type: 'admin' | 'student' = 'admin'): Promise<boolean> => {
    console.log(`[AuthProvider] ${type} Login called with:`, data);
    try {
      const endpoint = type === 'admin' ? API_ROUTES.ADMIN_AUTH.LOGIN : API_ROUTES.STUDENT_AUTH.LOGIN;
      const response = await api.post(endpoint, data); 
      console.log("[AuthProvider] Login response:", response);

      const responseData = response.data;
      
      const token = responseData.token;
      
      if (token) {
        console.log("[AuthProvider] Token received:", token);

        const allowedRoles = ['admin', 'coordinator', 'super_admin'];
        if (type === 'admin' && !allowedRoles.includes(responseData.role)) {
           toast.error("Unauthorized access. Dashboard credentials required.");
           return false;
        }

        localStorage.setItem('token', token);
        
        const userData: User = {
          id: responseData.id, 
          email: responseData.email,
          role: responseData.role,
          name: responseData.name || responseData.email.split('@')[0],
          department_code: responseData.department_code,
          permissions: responseData.permissions || [],
          profile_photo_url: responseData.profile_photo_url,
        };

        console.log("[AuthProvider] User data derived:", userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        router.push(PAGE_ROUTES.DASHBOARD);
        return true;
      } else {
        toast.error("Login failed. No token received.");
        return false;
      }
    } catch (error: any) {
       console.warn("[AuthProvider] Login handled:", error?.message || 'Auth error');
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
    setUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
    collegeSettings,
    updateCollegeSettings
  }), [user, isAuthenticated, isLoading, collegeSettings]);

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
