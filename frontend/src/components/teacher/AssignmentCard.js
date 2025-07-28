import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import { Link } from 'react-router-dom';

export default function AssignmentCard({ assignment, onDelete }) {
  return (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <div>
            <Typography variant="h6" component="div">
              {assignment.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Class: {assignment.className}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subject: {assignment.subjectName}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={assignment.status} 
                size="small" 
                color={assignment.status === 'active' ? 'success' : 'default'}
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Due: {new Date(assignment.dueDate).toLocaleDateString()}
              </Typography>
            </Box>
          </div>
          <Box>
            <Button 
              component={Link} 
              to={`/assignment/${assignment.id}`}
              size="small" 
              variant="outlined" 
              sx={{ mr: 1 }}
            >
              View
            </Button>
            <Button 
              size="small" 
              color="error" 
              variant="outlined"
              onClick={() => onDelete(assignment.id)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
