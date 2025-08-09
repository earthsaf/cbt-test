import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Clear all auth data from storage
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    if (window.location.hostname !== 'localhost') {
      document.cookie = `token=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }, []);

  // Check authentication status on mount and route change
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Clear any existing timeouts
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }

        // Check if we have a token in cookies (preferred) or localStorage (fallback)
        const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || 
                     localStorage.getItem('token');
        
        if (!token) {
          if (isMounted) {
            clearAuthData();
            setLoading(false);
          }
          return;
        }

        // Verify token with server
        const response = await axios.get('/api/auth/session', { 
          withCredentials: true,
          // Don't retry failed requests to prevent hanging
          'axios-retry': {
            retries: 0
          }
        });
        
        if (isMounted && response.data.authenticated && response.data.user) {
          const { user } = response.data;
          console.log('Session verified for user:', user.email);
          
          // Store minimal user data in state
          const userInfo = {
            id: user.id,
            email: user.email,
            username: user.username || user.email,
            role: user.role,
            name: user.name || user.email.split('@')[0]
          };
          
          localStorage.setItem('user', JSON.stringify(userInfo));
          localStorage.setItem('userRole', user.role);
          
          setUser(userInfo);
          setIsAuthenticated(true);
          setSessionExpired(false);
          
          // Set up session timeout (5 hours from now or use server-provided expiration)
          const expiresIn = response.data.expiresIn || 5 * 60 * 60 * 1000; // Default to 5 hours
          
          // Set timeout to automatically log out when session expires
          sessionTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              setSessionExpired(true);
              clearAuthData();
              setUser(null);
              setIsAuthenticated(false);
              
              // Redirect to login with a message if not already there
              if (!window.location.pathname.includes('login')) {
                navigate('/staff-login', { 
                  state: { 
                    from: window.location.pathname,
                    sessionExpired: true 
                  } 
                });
              }
            }
          }, expiresIn);
        } else if (isMounted) {
          console.log('Session not valid, clearing auth data');
          clearAuthData();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Clean up timeout on unmount
    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [clearAuthData, location, navigate]);

  // Silent login used during session verification
  const silentLogin = useCallback(async (userData) => {
    if (!userData) return { success: false, error: 'No user data provided' };
    
    console.log('Performing silent login for user:', userData.email);
    
    try {
      // Store minimal user data in state
      const userInfo = {
        id: userData.id,
        email: userData.email,
        username: userData.username || userData.email,
        role: userData.role,
        name: userData.name || userData.email.split('@')[0]
      };
      
      localStorage.setItem('user', JSON.stringify(userInfo));
      localStorage.setItem('userRole', userData.role);
      
      // Update state
      setUser(userInfo);
      setIsAuthenticated(true);
      setSessionExpired(false);
      
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Silent login failed:', error);
      return { success: false, error: error.message };
    }
  }, [setUser, setIsAuthenticated, setSessionExpired]);

  const login = async (credentials, silent = false) => {
    try {
      // Clear any existing session data first
      clearAuthData();
      
      console.log('Attempting login with credentials:', { ...credentials, password: '***' });
      
      const response = await axios.post('/api/auth/login', 
        credentials,
        { 
          withCredentials: true,
          // Don't retry failed requests to prevent hanging
          'axios-retry': {
            retries: 0
          }
        }
      );
      
      console.log('Login response received:', response.data);
      
      const { user, sessionTimeout } = response.data;
      
      // Validate user role matches requested role if provided
      if (credentials.role && user.role !== credentials.role) {
        throw new Error(`Invalid role: expected ${credentials.role}, got ${user.role}`);
      }
      
      // Store minimal user data in localStorage
      const userData = {
        id: user.id,
        email: user.email,
        username: user.username || user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0]
      };
      
      console.log('Setting user data in localStorage and state');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', user.role);
      
      // Set user state
      setUser(userData);
      setIsAuthenticated(true);
      setSessionExpired(false);
      
      // Set up session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      
      // Set timeout for auto-logout
      const timeout = sessionTimeout || 5 * 60 * 60 * 1000; // Default to 5 hours
      console.log('Setting session timeout for', timeout, 'ms');
      
      sessionTimeoutRef.current = setTimeout(() => {
        console.log('Session timeout reached, logging out');
        setSessionExpired(true);
        clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        navigate('/staff-login', { state: { sessionExpired: true } });
      }, timeout);
      
      return { success: true, user: userData };
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
      
      // Clear any partial auth data on login failure
      clearAuthData();
      
      return { 
        success: false, 
        error: errorMessage,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  };

  const logout = useCallback(async () => {
    console.log('Logout initiated');
    try {
      // Call server-side logout to clear session
      await axios.post('/api/auth/logout', {}, { 
        withCredentials: true,
        // Don't retry failed requests to prevent hanging
        'axios-retry': {
          retries: 0
        }
      });
    } catch (error) {
      // Don't treat logout failures as critical
      console.log('Logout API call failed (non-critical):', error.message);
    } finally {
      // Clear client-side auth data
      clearAuthData();
      
      // Clear any pending timeouts
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpired(false);
      
      // Force a full page reload to clear any cached data
      window.location.href = '/staff-login';
    }
  }, [clearAuthData]);

  // Return the AuthProvider with all the necessary values
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        sessionExpired,
        login,
        logout,
        silentLogin, 
        clearAuthData, 
      }}
    >
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
