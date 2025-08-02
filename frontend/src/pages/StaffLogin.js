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
  const [showLoginForm, setShowLoginForm] = useState(!user);

  useEffect(() => {
    // Reset form state when component mounts or when user logs out
    const storedUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      // If we have a stored user and token, update the auth context
      // The login function will handle setting the user in the context
      login({ 
        username: storedUser.username, 
        password: '', // Password not needed here as we already have a token
        role: storedUser.role 
      }).then(() => {
        const destination = storedUser.role === 'invigilator' ? '/proctor' : `/${storedUser.role}`;
        navigate(destination, { replace: true });
      }).catch(error => {
        console.error('Auto-login failed:', error);
        // Clear invalid auth data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setShowLoginForm(true);
      });
    } else {
      // No user is logged in, show the login form
      setShowLoginForm(true);
      // Clear any potential stale state
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [navigate, login]);


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
