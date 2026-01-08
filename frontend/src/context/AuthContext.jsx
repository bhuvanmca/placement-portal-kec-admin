import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (userData) => {
    try {
      setLoading(true);
      
      // Try to connect to backend first
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success) {
        const { user, token } = data.data;
        
        setIsAuthenticated(true);
        setUser({
          ...user,
          name: `${user.firstName} ${user.lastName}`
        });
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({
          ...user,
          name: `${user.firstName} ${user.lastName}`
        }));
      }
    } catch (error) {
      console.error('Backend login error, using offline mode:', error);
      
      // Fallback to offline mode for demo purposes
      setIsAuthenticated(true);
      setUser({
        email: userData.email,
        name: userData.email.split('@')[0],
        role: 'student'
      });
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify({
        email: userData.email,
        name: userData.email.split('@')[0],
        role: 'student'
      }));
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setLoading(true);
      
      // Try to connect to backend first
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      if (data.success) {
        const { user, token } = data.data;
        
        setIsAuthenticated(true);
        setUser({
          ...user,
          name: `${user.firstName} ${user.lastName}`
        });
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({
          ...user,
          name: `${user.firstName} ${user.lastName}`
        }));
      }
    } catch (error) {
      console.error('Backend signup error, using offline mode:', error);
      
      // Fallback to offline mode for demo purposes
      setIsAuthenticated(true);
      setUser({
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        role: 'student'
      });
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify({
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        role: 'student'
      }));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Function to verify token with backend
  const verifyToken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const user = data.data.user;
          setUser({
            ...user,
            name: `${user.firstName} ${user.lastName}`
          });
          return true;
        }
      }
      
      // Token is invalid, clear local storage
      logout();
      return false;
    } catch (error) {
      console.error('Token verification error:', error);
      logout();
      return false;
    }
  };

  // Check if user is already logged in on app load
  React.useEffect(() => {
    const initializeAuth = async () => {
      const storedAuth = localStorage.getItem('isAuthenticated');
      const token = localStorage.getItem('token');
      
      if (storedAuth === 'true' && token) {
        const isValid = await verifyToken();
        setIsAuthenticated(isValid);
      }
    };

    initializeAuth();
  }, []);

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    signup,
    logout,
    verifyToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};