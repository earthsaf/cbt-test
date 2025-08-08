import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import axios from 'axios';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { 
    user, 
    isAuthenticated, 
    loading, 
    sessionExpired, 
    logout, 
    silentLogin 
  } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const initialCheck = useRef(true);
  const from = location.state?.from?.pathname || '/';
  
  // Memoize the session verification function
  const verifySession = useCallback(async (forceCheck = false) => {
    // Skip verification if we're already verifying or if this is the initial render
    if ((verifyingSession && !forceCheck) || (initialCheck.current && !forceCheck)) {
      return;
    }
    
    try {
      setVerifyingSession(true);
      console.log('Verifying session...');
      
      const response = await axios.get('/api/auth/session', { 
        withCredentials: true,
        // Don't retry failed requests to prevent hanging
        'axios-retry': {
          retries: 0
        }
      });

      console.log('Session verification response:', response.data);

      if (response.data.authenticated && response.data.user) {
        // If we have a valid session but local state is not updated
        if (!isAuthenticated || user?.id !== response.data.user.id) {
          console.log('Updating auth state with silent login');
          await silentLogin(response.data.user);
        }
      } else if (isAuthenticated) {
        // Only logout if we're sure the session is invalid
        console.log('Session no longer valid, logging out');
        logout();
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      
      // Only treat as error if we're actually authenticated
      if (isAuthenticated) {
        // Don't show error for network issues during initial check
        if (!initialCheck.current) {
          setVerificationError('Failed to verify session. Please check your connection.');
        }
        // Only logout if we get a 401 or if this isn't the initial check
        if (error.response?.status === 401 || !initialCheck.current) {
          logout();
        }
      }
    } finally {
      setVerifyingSession(false);
      initialCheck.current = false;
    }
  }, [isAuthenticated, user, logout, silentLogin, verifyingSession]);

  // Handle session expiration
  useEffect(() => {
    if (sessionExpired) {
      const timer = setTimeout(() => {
        logout();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, logout]);

  // Verify session on mount with a small delay to allow cookie to be set
  useEffect(() => {
    const timer = setTimeout(() => {
      verifySession(true);
    }, 300); // Small delay to ensure cookie is set
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Only re-verify when auth state changes and we're not in the initial check
  useEffect(() => {
    if (!initialCheck.current) {
      verifySession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Show loading state only during initial auth check
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Verifying your session...
        </Typography>
      </Box>
    );
  }

  // Show session expired message
  if (sessionExpired) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 3,
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h5" color="error">
          Your session has expired
        </Typography>
        <Typography variant="body1">
          For security reasons, your session has ended due to inactivity.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Redirecting to login page...
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            logout();
            navigate('/staff-login', { 
              state: { 
                from: location,
                sessionExpired: true 
              } 
            });
          }}
          sx={{ mt: 2 }}
        >
          Return to Login
        </Button>
      </Box>
    );
  }

  // If verification failed with an error
  if (verificationError) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h6" color="error">
          Session Verification Failed
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {verificationError}
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.href = '/staff-login'}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  // If not authenticated, redirect to login with the current location
  if (!isAuthenticated || !user) {
    return <Navigate to="/staff-login" state={{ from: location }} replace />;
  }

  // If a specific role is required and the user doesn't have it
  if (requiredRole && user.role !== requiredRole) {
    // If trying to access admin area without admin role
    if (location.pathname.startsWith('/admin') && user.role !== 'admin') {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    
    // If trying to access student area without student role
    if (location.pathname.startsWith('/student') && user.role !== 'student') {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    
    // For other role mismatches
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If everything checks out, render the protected content
  return children;
};
