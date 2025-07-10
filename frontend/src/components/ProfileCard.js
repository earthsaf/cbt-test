import React from 'react';
import { Card, CardContent, Typography, Avatar, Box, Chip } from '@mui/material';
import { FaUser, FaGraduationCap, FaCalendar, FaMapMarkerAlt } from 'react-icons/fa';

const ProfileCard = ({ user }) => {
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ width: 64, height: 64, mr: 2 }}>
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" component="div">
              {user.name || 'Unknown User'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          <Chip
            icon={<FaUser />}
            label={`Role: ${user.role || 'Unknown'}`}
            color={user.role === 'teacher' ? 'primary' : user.role === 'student' ? 'secondary' : 'default'}
          />
          {user.department && (
            <Chip
              icon={<FaGraduationCap />}
              label={`Dept: ${user.department}`}
              color="default"
            />
          )}
          {user.joinDate && (
            <Chip
              icon={<FaCalendar />}
              label={`Joined: ${formatDate(user.joinDate)}`}
              color="default"
            />
          )}
          {user.location && (
            <Chip
              icon={<FaMapMarkerAlt />}
              label={`Location: ${user.location}`}
              color="default"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
