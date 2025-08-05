import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data;
      
      // Validate user role matches requested role
      if (user.role !== credentials.role) {
        throw new Error(`Invalid role: expected ${credentials.role}, got ${user.role}`);
      }
      
      // Save user data and token
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user };
    } catch (error) {
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Server responded with status ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response received from server. Please check your internet connection.';
      } else {
        errorMessage = error.message || 'An error occurred during login';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setUser(null);
    setIsAuthenticated(false);
    return { success: true };
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
 