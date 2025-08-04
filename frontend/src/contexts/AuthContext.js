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
        password: credentials.password ? '[HIDDEN]' : 'undefined' 
      });
      
      console.log('AuthContext: Sending login request to /auth/login');
      
      const response = await api.post('/auth/login', credentials);
      console.log('AuthContext: Login response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });
      
      const { user, token } = response.data;
      
      if (!user || !token) {
        const errorMsg = 'Invalid response from server - missing user or token';
        console.error('AuthContext:', errorMsg, response.data);
        throw new Error(errorMsg);
      }
      
      console.log('AuthContext: Login successful, saving user and token to localStorage');
      
      // Save user data and token
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      console.log('AuthContext: Updating user state with:', user);
      setUser(user);
      
      // Log the stored values to verify they were saved correctly
      console.log('AuthContext: Stored user in localStorage:', localStorage.getItem('user'));
      console.log('AuthContext: Stored token in localStorage:', localStorage.getItem('token'));
      
      return { success: true, user, status: response.status };
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
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Failed to log out' };
    }
  }, []);

  const updateUser = (updatedUser) => {
    const newUser = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

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
