import React, { useEffect, useState, useCallback } from 'react';
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
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [verificationError, setVerificationError] = useState(null);
  const from = location.state?.from?.pathname || '/';
  
  // Memoize the session verification function
  const verifySession = useCallback(async () => {
    try {
      setVerifyingSession(true);
      console.log('Verifying session...');
      
      const response = await axios.get('/api/auth/session', { 
        withCredentials: true 
      });

      console.log('Session verification response:', response.data);

      if (response.data.authenticated && response.data.user) {
        // If we have a valid session but local state is not updated
        if (!isAuthenticated || user?.id !== response.data.user.id) {
          console.log('Updating auth state with silent login');
          await silentLogin(response.data.user);
        }
      } else if (isAuthenticated) {
        // If we think we're authenticated but server says no
        console.log('Session no longer valid, logging out');
        logout();
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      setVerificationError('Failed to verify session. Please log in again.');
      if (isAuthenticated) {
        logout();
      }
    } finally {
      setVerifyingSession(false);
    }
  }, [isAuthenticated, user, logout, silentLogin]);

  // Handle session expiration
  useEffect(() => {
    if (sessionExpired) {
      const timer = setTimeout(() => {
        logout();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, logout]);

  // Verify session on mount and when auth state changes
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Show loading state during initial auth check or session verification
  if (loading || verifyingSession) {
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
