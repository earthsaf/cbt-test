import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return false;
    }

    try {
      console.log('AuthContext: Checking authentication status...');
      const response = await api.get('/auth/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      console.log('AuthContext: Auth check response:', response.data);
      
      if (response.data?.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('AuthContext: Error checking auth status:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
    return false;
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    try {
      console.log('AuthContext: Attempting login with credentials:', { 
        ...credentials, 
        password: credentials.password ? '[HIDDEN]' : 'undefined',
        role: credentials.role 
      });
      
      if (!credentials.role) {
        throw new Error('Role must be specified for login');
      }

      console.log('AuthContext: Making API request to /auth/login');
      const response = await api.post('/auth/login', credentials);
      
      console.log('AuthContext: Received response:', response.data);
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
      const errorDetails = {
        message: error.message,
        name: error.name,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        } : null,
        request: error.request ? {
          method: error.config?.method,
          url: error.config?.url,
          data: error.config?.data,
          headers: error.config?.headers,
        } : null,
        config: error.config ? {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
          timeout: error.config.timeout,
          withCredentials: error.config.withCredentials,
          xsrfCookieName: error.config.xsrfCookieName,
          xsrfHeaderName: error.config.xsrfHeaderName,
        } : null
      };
      
      console.error('Login error details:', JSON.stringify(errorDetails, null, 2));
      
      // Extract error message from response or use default
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data) {
          errorMessage = error.response.data.error || 
                        error.response.data.message || 
                        `Server responded with status ${error.response.status}`;
        } else {
          errorMessage = `Server responded with status ${error.response.status} and no data`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server. Please check your internet connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || 'An error occurred during login';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
        details: errorDetails
      };
    }
  };

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Failed to log out' };
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
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
 