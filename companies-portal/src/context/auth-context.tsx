'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, LoginCredentials } from '@/types/auth';
import { API_ROUTES } from '@/constants/config';
import { APP_ROUTES } from '@/constants/routes';
import { isTokenExpired } from '@/utils/auth';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginCredentials) => Promise<boolean>;
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
            const token = localStorage.getItem('token');
            if (token) {
                if (isTokenExpired(token)) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    setIsAuthenticated(false);
                    toast.error("Session expired. Please login again.");
                    router.push(APP_ROUTES.LOGIN);
                } else {
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                    setIsAuthenticated(true);
                }
            } else {
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        };
        initAuth();
    }, [router]);

    const login = async (data: LoginCredentials): Promise<boolean> => {
        try {
            const response = await api.post(API_ROUTES.ADMIN_AUTH.LOGIN, data);
            const responseData = response.data;

            const token = responseData.token;

            if (token) {
                if (responseData.role !== 'admin') {
                    toast.error("Unauthorized access. Admin credentials required.");
                    return false;
                }

                localStorage.setItem('token', token);

                const userData: User = {
                    email: responseData.email,
                    role: responseData.role,
                    name: responseData.email.split('@')[0]
                };

                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                setIsAuthenticated(true);
                router.push(APP_ROUTES.DASHBOARD);
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        router.push(APP_ROUTES.LOGIN);
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
