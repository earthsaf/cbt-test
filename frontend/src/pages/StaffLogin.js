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
  // Always show login form when this component mounts
  const [showLoginForm, setShowLoginForm] = useState(true);

  useEffect(() => {
    // Clear any existing auth data to prevent auto-redirect
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Clear form state
    setUsername('');
    setPassword('');
    setError('');
    
    // Force the user state to null in the auth context
    if (user) {
      // This will trigger a re-render with user=null
      logout();
    }
  }, [user, logout]);

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setRole(newRole);
    }
  };

  const handleLogoutAndSwitch = () => {
    logout();
    // The useEffect hook will handle setting showLoginForm to true
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
        console.error('Login failed:', result);
        let errorMessage = result.error || 'Login failed';
        
        // Provide more specific error messages based on the status code
        if (result.status === 401) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else if (result.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (result.data?.error) {
          errorMessage = result.data.error;
        }
        
        setError(errorMessage);
      }
      // On success, hide the login form so the redirect effect runs
      if (result.success) {
        setShowLoginForm(false);
      }
      // The user state will update in AuthContext and the useEffect will trigger redirection
    } catch (err) {
      console.error('Unexpected error during login:', err);
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
        
        {!showLoginForm && user ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Signed in as <strong>{user.name || user.username}</strong> ({user.role}).
            </Typography>
            <Button variant="outlined" onClick={handleLogoutAndSwitch}>
              Logout & Sign In as Different User
            </Button>
          </Box>
        ) : (
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
                label={`${role.charAt(0).toUpperCase() + role.slice(1)} Username`}
                variant="outlined"
                fullWidth
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ mb: 2 }}
                autoComplete="username"
              />

              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                autoComplete="current-password"
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                  {error}
                </Alert>
              )}

              <LoadingButton
                type="submit"
                variant="contained"
                fullWidth
                loading={loading}
                size="large"
                sx={{ py: 1.5, fontWeight: 'bold' }}
              >
                Sign In
              </LoadingButton>
            </Box>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <MuiLink component="button" variant="body2" onClick={() => navigate('/student-login')}>
            Are you a student? Sign in here.
          </MuiLink>
        </Box>
      </Paper>
    </Box>
  );
}

export default StaffLogin;
