'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, LoginCredentials, AuthResponse } from '@/types/auth'; // Centralized types
import { API_ROUTES } from '@/constants/config';
import { APP_ROUTES as PAGE_ROUTES } from '@/constants/routes'; 

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginCredentials) => Promise<void>;
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
        console.log("[AuthProvider] Found token, setting authenticated state.");
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
             setUser(JSON.parse(storedUser));
        }
        setIsAuthenticated(true);
      } else {
        console.log("[AuthProvider] No token found.");
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (data: LoginCredentials) => {
    console.log("[AuthProvider] Login called with:", data);
    try {
      // Use API_ROUTES.LOGIN if defined, else just string (let's check my file creation)
      // I defined API_ROUTES in config.ts
      const response = await api.post('/auth/login', data); 
      console.log("[AuthProvider] Login response:", response);

      const responseData = response.data;
      
      const token = responseData.token;
      
      if (token) {
        console.log("[AuthProvider] Token received:", token);
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
      } else {
        console.error("[AuthProvider] Login successful but no token found in response:", responseData);
        throw new Error("No access token received");
      }
    } catch (error) {
       console.error("[AuthProvider] Login error:", error);
       throw error;
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
