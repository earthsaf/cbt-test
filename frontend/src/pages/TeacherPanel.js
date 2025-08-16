import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Snackbar, Alert, 
  Paper, TextField, MenuItem, Divider, IconButton, Tooltip
} from '@mui/material';
import { Logout, Add as AddIcon, List as ListIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import QuestionList from '../components/teacher/QuestionList';
import api from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QuestionForm from '../components/teacher/QuestionForm';

function TeacherPanel() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State for assignments and questions
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({ 
    text: '', 
    options: ['', '', '', ''], 
    answer: '',
    type: 'mcq',
    marks: 1
  });
  
  // UI State
  const [loading, setLoading] = useState({
    assignments: false,
    questions: false,
    submitting: false
  });
  const [snack, setSnack] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  // Fetch teacher's assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, assignments: true }));
      const res = await api.get('/teacher/assignments');
      
      const assignmentsData = (Array.isArray(res.data) ? res.data : (res.data?.data || [])).map(assignment => ({
        ...assignment,
        class: assignment.class || { id: assignment.classId, name: 'Class ' + assignment.classId },
        subject: assignment.subject || { id: assignment.subjectId, name: 'Subject ' + assignment.subjectId }
      }));
      
      setAssignments(assignmentsData);
      
      // If there's only one assignment, select it by default
      if (assignmentsData.length === 1) {
        handleAssignmentSelect(assignmentsData[0]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        },
        stack: error.stack
      });
      toast.error('Failed to load assignments. Please try again later.');
    } finally {
      setLoading(prev => ({ ...prev, assignments: false }));
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, students: true }));
      const res = await api.get('/teacher/students');
      setStudents(res.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students.');
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  }, []);

  const fetchQuestions = useCallback(async (assignmentId) => {
    if (!assignmentId) return;
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      const res = await api.get(`/teacher/assignments/${assignmentId}/questions`);
      setQuestions(res.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions.');
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      const res = await api.get('/teacher/profile');
      setProfile(res.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile.');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  }, []);

  const fetchAnalytics = useCallback(async (assignmentId) => {
    if (!assignmentId) return;
    try {
      setLoadingAnalytics(true);
      const res = await api.get(`/teacher/analytics/assignments/${assignmentId}`);
      setAnalytics(res.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/teacher/assignments/${id}`);
      setAssignments(assignments.filter(a => a.id !== id));
      setSnack({ open: true, message: 'Assignment deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setSnack({ open: true, message: 'Failed to delete assignment', severity: 'error' });
    }
  };

  const handleUploadQuestions = (assignment) => {
    setSelectedAssignment(assignment);
    setUploadDialogOpen(true);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedAssignment) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      setIsUploading(true);
      await api.post(`/teacher/assignments/${selectedAssignment.id}/questions/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSnack({ open: true, message: 'Questions uploaded successfully', severity: 'success' });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      // Refresh questions if we're viewing them
      if (selectedAssignment.id === selectedAssignmentId) {
        fetchQuestions(selectedAssignmentId);
      }
    } catch (error) {
      console.error('Error uploading questions:', error);
      setSnack({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to upload questions', 
        severity: 'error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question.id);
    setCurrentQuestion(question);
  };

  const handleEditSave = async () => {
    if (!editingQuestion) return;
    
    try {
      await api.put(`/teacher/questions/${editingQuestion}`, currentQuestion);
      toast.success('Question updated successfully!');
      setEditingQuestion(null);
      fetchQuestions(selectedAssignmentId);
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question.');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await api.delete(`/teacher/questions/${id}`);
      toast.success('Question deleted successfully!');
      fetchQuestions(selectedAssignmentId);
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question.');
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedAssignment) return;
    if (!window.confirm('Are you sure you want to delete all questions for this assignment?')) return;
    
    try {
      await api.delete(`/teacher/assignments/${selectedAssignment.id}/questions`);
      toast.success('All questions deleted successfully!');
      setQuestions([]);
    } catch (error) {
      console.error('Error deleting all questions:', error);
      toast.error('Failed to delete all questions.');
    }
  };

  const handleProfileUpdate = async (updatedData, newProfilePicture) => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      const formData = new FormData();
      formData.append('name', updatedData.name);
      formData.append('email', updatedData.email);
      if (newProfilePicture) {
        formData.append('profilePicture', newProfilePicture);
      }

      const res = await api.put('/teacher/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setProfile(res.data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to login page
    navigate('/login');
  };

  useEffect(() => {
    fetchAssignments();
    fetchProfile();
  }, [fetchAssignments, fetchProfile]);

  // Handle assignment selection
  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
    fetchQuestions(assignment.id);
  };

  // Fetch questions for the selected assignment
  const fetchQuestions = async (assignmentId) => {
    if (!assignmentId) return;
    
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      const res = await api.get(`/teacher/assignments/${assignmentId}/questions`);
      setQuestions(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (error) {
      console.error('Error fetching questions:', error);
      setSnack({
        open: true,
        message: 'Failed to load questions',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  // Handle question form submission
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    
    try {
      setLoading(prev => ({ ...prev, submitting: true }));
      
      if (isEditing) {
        await api.put(`/teacher/questions/${currentQuestion.id}`, {
          ...currentQuestion,
          assignmentId: selectedAssignment.id
        });
        setSnack({ open: true, message: 'Question updated successfully', severity: 'success' });
      } else {
        await api.post('/teacher/questions', {
          ...currentQuestion,
          assignmentId: selectedAssignment.id
        });
        setSnack({ open: true, message: 'Question added successfully', severity: 'success' });
      }
      
      // Refresh questions
      fetchQuestions(selectedAssignment.id);
      // Reset form
      setCurrentQuestion({ 
        text: '', 
        options: ['', '', '', ''], 
        answer: '',
        type: 'mcq',
        marks: 1
      });
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error saving question:', error);
      setSnack({
        open: true,
        message: error.response?.data?.message || 'Failed to save question',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  // Removed file upload functionality as per user request

  // Handle logout
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Fetch assignments on component mount
  useEffect(() => {
    fetchAssignments();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          Teacher Dashboard
        </Typography>
        <Box>
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} color="inherit">
              <Logout />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Box sx={{ p: 2, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Assignment Selection */}
        {!selectedAssignment ? (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select an Assignment
            </Typography>
            {loading.assignments ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : assignments.length === 0 ? (
              <Typography color="textSecondary">
                No assignments found. Please contact your administrator.
              </Typography>
            ) : (
              <Box sx={{ '& > *': { mb: 1 } }}>
                {assignments.map((assignment) => (
                  <Button
                    key={assignment.id}
                    variant="outlined"
                    fullWidth
                    onClick={() => handleAssignmentSelect(assignment)}
                    sx={{ 
                      p: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      textTransform: 'none',
                      textAlign: 'left'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1">
                        {assignment.class?.name} - {assignment.subject?.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Manage questions for this class/subject
                      </Typography>
                    </Box>
                    <ListIcon />
                  </Button>
                ))}
              </Box>
            )}
          </Paper>
        ) : (
          <>
            {/* Assignment Header */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">
                    {selectedAssignment.class?.name} - {selectedAssignment.subject?.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Manage questions for this assignment
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  onClick={() => setSelectedAssignment(null)}
                >
                  Change Assignment
                </Button>
              </Box>
            </Paper>

            {/* Question Form */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isEditing ? 'Edit Question' : 'Add New Question'}
              </Typography>
              <QuestionForm
                question={currentQuestion}
                onChange={setCurrentQuestion}
                onSubmit={handleQuestionSubmit}
                onCancel={() => {
                  setIsEditing(false);
                  setCurrentQuestion({ 
                    text: '', 
                    options: ['', '', '', ''], 
                    answer: '',
                    type: 'mcq',
                    marks: 1
                  });
                }}
                loading={loading.submitting}
              />
            </Paper>

            {/* Question List */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Questions</Typography>
              
              <QuestionList
                questions={questions}
                loading={loading.questions}
                onEdit={(question) => {
                  setCurrentQuestion(question);
                  setIsEditing(true);
                }}
                onDelete={async (id) => {
                  try {
                    await api.delete(`/teacher/questions/${id}`);
                    setSnack({ open: true, message: 'Question deleted', severity: 'success' });
                    fetchQuestions(selectedAssignment.id);
                  } catch (error) {
                    console.error('Error deleting question:', error);
                    setSnack({
                      open: true,
                      message: 'Failed to delete question',
                      severity: 'error'
                    });
                  }
                }}
              />
            </Paper>
          </>
        )}
      </Box>

      {/* File upload functionality removed as per user request */}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnack(prev => ({ ...prev, open: false }))} 
          severity={snack.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TeacherPanel;
