import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Refs for tracking state that shouldn't trigger re-renders
  const sessionTimeoutRef = useRef(null);
  const authCheckInProgressRef = useRef(false);
  const loginInProgressRef = useRef(false);
  const loginControllerRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Clear all auth data from storage
  const clearAuthData = useCallback(() => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      if (window.location.hostname !== 'localhost') {
        document.cookie = `token=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } catch (error) {
      console.warn('Error clearing auth data:', error);
    }
  }, []);

  // Check authentication status on mount and route change
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    
    const checkAuth = async () => {
      // Prevent multiple concurrent auth checks
      if (authCheckInProgressRef.current) {
        return;
      }
      
      authCheckInProgressRef.current = true;
      
      try {
        // Clear any existing timeouts
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }

        console.log('Verifying session with server');
        const response = await axios.get('/api/auth/session', { 
          withCredentials: true,
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 15000 // 15 second timeout
        });
        
        if (!isMounted) return;
        
        if (response.data.authenticated && response.data.user) {
          const { user, expiresIn } = response.data;
          console.log('Session verified for user:', user.email);
          
          // Store minimal user data in state
          const userInfo = {
            id: user.id,
            email: user.email,
            username: user.username || user.email,
            role: user.role,
            name: user.name || user.email.split('@')[0]
          };
          
          try {
            localStorage.setItem('user', JSON.stringify(userInfo));
            localStorage.setItem('userRole', user.role);
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
          
          // Update state in a single batch
          setUser(userInfo);
          setIsAuthenticated(true);
          setSessionExpired(false);
          
          // Convert expiresIn to milliseconds if it's in seconds (common JWT format)
          const sessionDuration = expiresIn 
            ? expiresIn < 10000000000 ? expiresIn * 1000 : expiresIn // If less than 11 digits, assume it's in seconds
            : 5 * 60 * 60 * 1000; // Default to 5 hours
            
          console.log('Session duration set to:', sessionDuration, 'ms');
          
          // Clear any existing timeout
          if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
          }
          
          // Set new timeout
          sessionTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              console.log('Session timeout reached, logging out');
              setSessionExpired(true);
              clearAuthData();
              setUser(null);
              setIsAuthenticated(false);
              
              // Only redirect if not already on a login page
              if (!window.location.pathname.includes('login')) {
                navigate('/staff-login', { 
                  state: { 
                    from: window.location.pathname,
                    sessionExpired: true 
                  },
                  replace: true
                });
              }
            }
          }, sessionDuration);
          
          console.log('Auth check completed successfully');
        } else if (isMounted) {
          console.log('Session not valid, clearing auth data');
          clearAuthData();
        }
      } catch (error) {
        // Handle both axios v0.22+ and v1.0.0+ cancellation errors
        if (axios.isCancel?.(error) || error.name === 'CanceledError') {
          console.log('Auth check was cancelled');
          return;
        }
        
        console.error('Auth check failed:', error);
        
        if (isMounted) {
          clearAuthData();
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      } finally {
        if (isMounted) {
          authCheckInProgressRef.current = false;
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Clean up on unmount
    return () => {
      isMounted = false;
      authCheckInProgressRef.current = false;
      
      // Abort any in-flight requests
      controller.abort();
      
      // Clear any pending timeouts
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      // Reset loading state if component is unmounting
      if (loading) {
        setLoading(false);
      }
    };
  }, [clearAuthData, navigate]); // Removed loading and isAuthenticated from deps to prevent extra runs

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
      
      try {
        localStorage.setItem('user', JSON.stringify(userInfo));
        localStorage.setItem('userRole', userData.role);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
      // Update state
      setUser(userInfo);
      setIsAuthenticated(true);
      setSessionExpired(false);
      
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Silent login failed:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const login = useCallback(async (credentials) => {
    // Prevent multiple concurrent login attempts
    if (loginInProgressRef.current) {
      console.log('Login already in progress');
      return { 
        success: false, 
        error: 'A login attempt is already in progress' 
      };
    }
    
    const controller = new AbortController();
    loginInProgressRef.current = true;
    
    try {
      // Clear any existing session data first
      clearAuthData();
      
      console.log('Attempting login with credentials:', { 
        ...(credentials || {}), 
        password: credentials?.password ? '***' : undefined 
      });
      
      // Set loading state before making the request
      setLoading(true);
      
      const response = await axios.post('/api/auth/login', 
        credentials,
        { 
          withCredentials: true,
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('Login response received:', response.data);
      
      const { user, sessionTimeout } = response.data;
      
      // Validate user role matches requested role if provided
      if (credentials?.role && user.role !== credentials.role) {
        throw new Error(`Invalid role: expected ${credentials.role}, got ${user.role}`);
      }
      
      // Store minimal user data in state
      const userData = {
        id: user.id,
        email: user.email,
        username: user.username || user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0]
      };
      
      console.log('Setting user data in localStorage and state');
      
      // Try to persist to localStorage but don't fail if it doesn't work
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userRole', user.role);
      } catch (error) {
        console.warn('localStorage unavailable — continuing without persistence', error);
        // Don't throw - we can continue without localStorage
      }
      
      // Update state in a single batch
      setUser(userData);
      setIsAuthenticated(true);
      setSessionExpired(false);
      
      // Set up session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      // Convert sessionTimeout to milliseconds if it's in seconds (common JWT format)
      const timeout = sessionTimeout 
        ? sessionTimeout < 10000000000 ? sessionTimeout * 1000 : sessionTimeout // If less than 11 digits, assume it's in seconds
        : 5 * 60 * 60 * 1000; // Default to 5 hours
        
      console.log('Setting session timeout for', timeout, 'ms');
      
      sessionTimeoutRef.current = setTimeout(() => {
        console.log('Session timeout reached, logging out');
        setSessionExpired(true);
        clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        navigate('/staff-login', { 
          state: { sessionExpired: true },
          replace: true
        });
      }, timeout);
      
      console.log('Login successful, returning success');
      return { success: true, user: userData };
    } catch (error) {
      // Handle both axios v0.22+ and v1.0.0+ cancellation errors
      if (axios.isCancel?.(error) || error.name === 'CanceledError') {
        console.log('Login was cancelled');
        return { 
          success: false, 
          error: 'Login was cancelled',
          cancelled: true
        };
      }
      
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      let statusCode;
      let errorData;
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        statusCode = error.response.status;
        errorData = error.response.data;
        
        if (statusCode === 401) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (statusCode === 403) {
          errorMessage = 'You do not have permission to access this resource.';
        } else if (statusCode >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server responded with status ${statusCode}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else {
          errorMessage = 'No response from server. Please check your internet connection.';
        }
      } else if (error.message) {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      console.error('Login error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // Clear any partial auth data on login failure
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      
      return { 
        success: false, 
        error: errorMessage,
        status: statusCode,
        data: errorData
      };
    } finally {
      loginInProgressRef.current = false;
      loginControllerRef.current = null;
      setLoading(false);
    }
  }, [clearAuthData, navigate]);

  // Cleanup login controller on unmount
  useEffect(() => {
    return () => {
      loginControllerRef.current?.abort?.();
    };
  }, []); // Added dependencies for useCallback

  const logout = useCallback(async (options = {}) => {
    const { silent = false, redirect = true } = options;
    
    if (!silent) {
      console.log('Logout initiated');
    }
    
    // Clear any pending timeouts first
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    // Update state immediately for responsive UI
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpired(false);
    setLoading(true);
    
    try {
      // Call server-side logout to clear session
      await axios.post('/api/auth/logout', {}, { 
        withCredentials: true,
        timeout: 5000, // 5 second timeout
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!silent) {
        console.log('Logout successful');
      }
    } catch (error) {
      // Don't treat logout failures as critical, but log them
      const errorMessage = error.response 
        ? `Server responded with ${error.response.status}`
        : error.message;
        
      console.warn('Logout API call failed (non-critical):', errorMessage);
    } finally {
      // Always clear client-side auth data, even if server logout failed
      clearAuthData();
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpired(false);
      setLoading(false);
      
      // Reset login in progress flag
      loginInProgressRef.current = false;
      
      // Redirect if requested
      if (redirect && !silent) {
        // Use replace to prevent back button from returning to logged-in state
        navigate('/staff-login', { replace: true });
      }
    }
  }, [clearAuthData, navigate]); // Dependencies for useCallback

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    user,
    isAuthenticated,
    loading,
    sessionExpired,
    login,
    logout,
    silentLogin,
    clearAuthData,
    // Add any additional values here
  }), [
    user,
    isAuthenticated,
    loading,
    sessionExpired,
    login,
    logout,
    silentLogin,
    clearAuthData,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the auth context
 * @returns {Object} The auth context value
 * @throws {Error} If used outside of an AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context for advanced usage
export { AuthContext };
