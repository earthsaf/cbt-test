import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Paper, Typography, TextField, ToggleButton, ToggleButtonGroup, Alert, Button, Link as MuiLink } from '@mui/material';
import { LoadingButton } from '@mui/lab';

const roles = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'invigilator', label: 'Invigilator' },
  { value: 'admin', label: 'Admin' },
];

function StaffLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  // Clear any existing auth data to prevent auto-redirect
  useEffect(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Clear form state
    setUsername('');
    setPassword('');
    setError('');
    
    // Force the user state to null in the auth context
    if (user) {
      logout();
    }
  }, [user, logout]);

  // Redirect effect - when user is authenticated, redirect to appropriate page
  useEffect(() => {
    if (user && user.role) {
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'invigilator':
          navigate('/proctor');
          break;
        default:
          navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setRole(newRole);
    }
  };

  const handleLogoutAndSwitch = () => {
    logout();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Basic validation
    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }
    
    try {
      const result = await login({ username, password, role });
      
      if (!result.success) {
        let errorMessage = result.error || 'Login failed';
        
        if (result.status === 401) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else if (result.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #23243a 0%, #1976d2 100%)',
      }}
    >
      <Paper
        elevation={12}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          borderRadius: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Staff Login
        </Typography>
        
        {!user ? (
          <>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
              Select your role and sign in.
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <ToggleButtonGroup
                value={role}
                exclusive
                onChange={handleRoleChange}
                fullWidth
                sx={{ mb: 3 }}
              >
                {roles.map((r) => (
                  <ToggleButton key={r.value} value={r.value}>
                    {r.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <LoadingButton
                type="submit"
                fullWidth
                variant="contained"
                loading={loading}
                sx={{ mb: 2 }}
              >
                Sign In
              </LoadingButton>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/student-login')}
                sx={{ mb: 1 }}
              >
                Student Login
              </Button>
            </Box>
          </>
        ) : (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Signed in as <strong>{user.name || user.username}</strong> ({user.role}).
            </Typography>
            <Button variant="outlined" onClick={handleLogoutAndSwitch}>
              Logout & Sign In as Different User
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default StaffLogin;
