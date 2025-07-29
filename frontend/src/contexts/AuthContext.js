import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from localStorage on mount - but don't auto-login
  useEffect(() => {
    // We're not automatically logging in from localStorage anymore
    // Users must explicitly log in through the login form
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      console.log('Attempting login with credentials:', { 
        ...credentials, 
        password: credentials.password ? '[HIDDEN]' : 'undefined' 
      });
      
      // Log the full request being sent
      console.log('Sending request to:', '/auth/login');
      console.log('Request method:', 'POST');
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'withCredentials': true
      });
      
      const response = await api.post('/auth/login', credentials);
      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);
      console.log('Login response data:', response.data);
      
      const { user, token } = response.data;
      
      if (!user || !token) {
        console.error('Missing user or token in response:', response.data);
        throw new Error('Invalid response from server - missing user or token');
      }
      
      // Save user data and token
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      setUser(user);
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
    updateUser
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
