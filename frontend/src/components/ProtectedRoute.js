import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated, loading, sessionExpired, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || '/';
  
  // Handle session expiration
  useEffect(() => {
    if (sessionExpired) {
      // Clear any existing timeouts to prevent multiple notifications
      const timer = setTimeout(() => {
        logout();
      }, 5000); // Auto-logout after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, logout]);

  // Show loading state
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
