import React from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  Box, 
  Chip, 
  Divider,
  Book,
  AccessTime,
  Group,
  UploadFile
} from '@mui/material';

const AssignmentCard = ({ 
  assignment, 
  onUpload, 
  onViewQuestions, 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  if (!assignment || typeof assignment !== 'object') {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography color="error">Invalid assignment data.</Typography>
        </CardContent>
      </Card>
    );
  }
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FaBook size={24} color="#1976d2" />
          <Typography variant="h6" component="div" sx={{ ml: 1 }}>
            {assignment.title || 'Untitled Assignment'}
            {assignment.subject ? ` (${assignment.subject})` : ''}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {assignment.description || 'No description provided'}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          <Chip
            icon={<FaClock />}
            label={`Due: ${formatDate(assignment.dueDate)}`}
            color="primary"
          />
          <Chip
            icon={<FaUsers />}
            label={`Students: ${assignment.studentCount || 0}`}
            color="secondary"
          />
          <Chip
            label={`Questions: ${assignment.questionCount || 0}`}
            color="default"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FaFileUpload />}
              onClick={onUpload}
              disabled={loading}
            >
              Upload Questions
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onViewQuestions}
              disabled={loading}
            >
              View Questions
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onEdit}
              disabled={loading}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={onDelete}
              disabled={loading}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AssignmentCard;
