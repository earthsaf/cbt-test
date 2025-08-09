import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Paper, Typography, TextField, ToggleButton, ToggleButtonGroup, Alert, Button } from '@mui/material';
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

  // Only run once on mount: clear localStorage ONLY if explicitly requested
  useEffect(() => {
    // Do not clear localStorage on mount. Instead, if you want to force a fresh session,
    // call logout() explicitly (e.g., a "Clear session" button).
    // This prevents auto-clearing while the AuthProvider is still verifying an HttpOnly cookie.
    setUsername('');
    setPassword('');
    setError('');
  }, []);

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
    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }
    try {
      const result = await login({ username, password, role });
      if (!result.success) {
        let errorMessage = result.error || 'Login failed';
        if (result.status === 401) errorMessage = 'Invalid username or password. Please try again.';
        if (result.status >= 500) errorMessage = 'Server error. Please try again later.';
        setError(errorMessage);
        return;
      }

      // Successful login — navigate to role-specific page immediately
      const currentRole = result.user?.role || role;
      let targetPath = '/';
      switch (currentRole) {
        case 'admin': targetPath = '/admin'; break;
        case 'teacher': targetPath = '/teacher'; break;
        case 'invigilator': targetPath = '/proctor'; break;
        default: targetPath = '/dashboard';
      }
      navigate(targetPath, { replace: true });
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
              Signed in as <strong>{user && user.name ? user.name : user && user.username}</strong> ({user && user.role}).
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
