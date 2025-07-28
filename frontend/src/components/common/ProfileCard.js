import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  Box, 
  Button, 
  Divider, 
  TextField,
  Grid,
  IconButton,
  useTheme
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';

export default function ProfileCard({ 
  user, 
  onSave, 
  onPasswordChange,
  isEditing = false,
  onEditToggle,
  onChange,
  errors = {}
}) {
  const theme = useTheme();
  
  if (!user) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading profile...</Typography>
        </CardContent>
      </Card>
    );
  }

  const { name, email, username, role, createdAt, Class } = user;

  return (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box display="flex" alignItems="center">
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                fontSize: 32,
                bgcolor: theme.palette.primary.main,
                mr: 2
              }}
            >
              {name?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h5" component="div">
                {name || 'No Name'}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                @{username}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {role?.charAt(0).toUpperCase() + role?.slice(1)}
              </Typography>
            </Box>
          </Box>
          
          {!isEditing ? (
            <Button 
              variant="outlined" 
              startIcon={<Edit />}
              onClick={onEditToggle}
            >
              Edit Profile
            </Button>
          ) : (
            <Box>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<Save />}
                onClick={onSave}
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Cancel />}
                onClick={onEditToggle}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Personal Information</Typography>
            
            {isEditing ? (
              <>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={user.name || ''}
                  onChange={onChange}
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name}
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={user.email || ''}
                  onChange={onChange}
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email}
                />
              </>
            ) : (
              <Box>
                <Typography variant="body1" paragraph>
                  <strong>Name:</strong> {name || 'Not provided'}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Email:</strong> {email || 'Not provided'}
                </Typography>
              </Box>
            )}
            
            <Typography variant="body1" paragraph>
              <strong>Member Since:</strong> {new Date(createdAt).toLocaleDateString()}
            </Typography>
            
            {Class && (
              <Typography variant="body1">
                <strong>Class:</strong> {Class.name}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
            
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              name="currentPassword"
              value={user.currentPassword || ''}
              onChange={onPasswordChange}
              margin="normal"
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
            />
            
            <TextField
              fullWidth
              type="password"
              label="New Password"
              name="newPassword"
              value={user.newPassword || ''}
              onChange={onPasswordChange}
              margin="normal"
              error={!!errors.newPassword}
              helperText={errors.newPassword}
            />
            
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              name="confirmPassword"
              value={user.confirmPassword || ''}
              onChange={onPasswordChange}
              margin="normal"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
            />
            
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button 
                variant="contained" 
                color="primary"
                onClick={onSave}
                disabled={!user.currentPassword || !user.newPassword || !user.confirmPassword}
              >
                Update Password
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
