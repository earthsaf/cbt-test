import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

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
  const [verificationError, setVerificationError] = useState(null);
  const verificationAttempted = useRef(false);
  const from = location.state?.from?.pathname || '/';
  
  // Debug log for auth state changes
  useEffect(() => {
    console.log('Auth state changed - isAuthenticated:', isAuthenticated, 'User:', user);
  }, [isAuthenticated, user]);
  
  // Verify session on mount and when auth state changes
  useEffect(() => {
    // Skip if we've already attempted verification
    if (verificationAttempted.current) {
      return;
    }

    // Mark that we've attempted verification
    verificationAttempted.current = true;
    
    // If we're not authenticated, try silent login if we have a user in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      console.log('Attempting silent login from ProtectedRoute');
      silentLogin(JSON.parse(storedUser))
        .then(result => {
          if (!result.success) {
            console.log('Silent login failed:', result.error);
            // Only set error if we're still not authenticated
            if (!isAuthenticated) {
              setVerificationError('Session expired. Please log in again.');
            }
          }
        })
        .catch(error => {
          console.error('Error during silent login:', error);
          if (!isAuthenticated) {
            setVerificationError('Failed to verify session. Please log in again.');
          }
        });
    } else if (!isAuthenticated) {
      // No stored user and not authenticated, set error to trigger redirect
      setVerificationError('No active session found. Please log in.');
    }
  }, [isAuthenticated, silentLogin]);

  // Handle session expiration
  useEffect(() => {
    if (sessionExpired) {
      console.log('Session expired, redirecting to login...');
      const timer = setTimeout(() => {
        logout();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, logout]);

  // Show loading state during initial auth check or session verification
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
          Loading...
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
    // If we're already on the login page, don't show the error to prevent loops
    if (location.pathname === '/staff-login' || location.pathname === '/login') {
      return null; // Let the login page handle the rendering
    }
    
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
          onClick={() => {
            // Clear any stale auth data
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            // Navigate to login with replace to prevent going back
            navigate('/staff-login', { 
              state: { from: location },
              replace: true 
            });
          }}
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
