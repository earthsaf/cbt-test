import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility as ViewIcon, Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';

export default function AssignmentCard({ assignment, onDelete, onViewQuestions, onUploadQuestions }) {
  const navigate = useNavigate();

  const handleView = (e) => {
    e.preventDefault();
    if (onViewQuestions) {
      onViewQuestions();
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (onUploadQuestions) {
      onUploadQuestions();
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (onDelete && window.confirm('Are you sure you want to delete this assignment?')) {
      onDelete(assignment.id);
    }
  };

  return (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="subtitle1" component="div" fontWeight="medium">
              {assignment.class?.name || 'No Class'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Subject: {assignment.subject?.name || 'No Subject'}
            </Typography>
          </div>
          <Box>
            <Tooltip title="View Questions">
              <IconButton 
                size="small" 
                color="primary"
                onClick={handleView}
                sx={{ mr: 1 }}
              >
                <ViewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload Questions">
              <IconButton 
                size="small" 
                color="primary"
                onClick={handleUpload}
                sx={{ mr: 1 }}
              >
                <UploadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Assignment">
              <IconButton 
                size="small" 
                color="error"
                onClick={handleDelete}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
