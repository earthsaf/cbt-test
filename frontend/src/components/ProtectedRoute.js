import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const location = useLocation();

  // Check authentication status when component mounts
  useEffect(() => {
    const verifyAuth = async () => {
      console.log('ProtectedRoute: Checking authentication...');
      console.log('ProtectedRoute: Current user:', user);
      console.log('ProtectedRoute: Current isAuthenticated:', isAuthenticated);
      
      // Only call checkAuth if we don't have a user already
      if (!user) {
        console.log('ProtectedRoute: No user found, calling checkAuth...');
        await checkAuth();
      } else {
        console.log('ProtectedRoute: User found, skipping checkAuth');
      }
      setIsCheckingAuth(false);
    };
    
    verifyAuth();
  }, [checkAuth, user]);

  console.log('ProtectedRoute: Auth state:', { isAuthenticated, user, isLoading, isCheckingAuth });

  if (isLoading || isCheckingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/staff-login" state={{ from: location }} replace />;
  }

  // If a specific role is required and the user doesn't have it
  if (requiredRole && user?.role !== requiredRole) {
    console.log('ProtectedRoute: User role mismatch, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return children;
};
