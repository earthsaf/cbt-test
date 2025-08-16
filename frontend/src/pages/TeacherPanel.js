import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, AppBar, Tabs, Tab, Typography, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Snackbar, Alert, useTheme, Toolbar, 
  IconButton, DialogContentText, TextField, InputAdornment
} from '@mui/material';
import { Assignment, People, BarChart, AccountCircle, Logout, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AssignmentCard from '../components/teacher/AssignmentCard';
import StudentList from '../components/teacher/StudentList';
import QuestionList from '../components/teacher/QuestionList';
import api from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QuestionForm from '../components/teacher/QuestionForm';

function TeacherPanel() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacherActiveTab') || 'assignments');
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState({
    assignments: false,
    students: false,
    questions: false,
    profile: false,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [file, setFile] = useState(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', options: ['', '', '', ''], answer: '' });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const tabs = [
    { id: 'assignments', label: 'Assignments & Questions', icon: <Assignment /> },
    { id: 'students', label: 'My Students', icon: <People /> },
    { id: 'analytics', label: 'Exam Analytics', icon: <BarChart /> },
    { id: 'profile', label: 'My Profile', icon: <AccountCircle /> },
  ];

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, assignments: true }));
      console.log('Fetching teacher assignments...');
      const res = await api.get('/teacher/assignments');
      console.log('Assignments response:', res.data);
      
      // Transform the data to match the expected format
      const assignmentsData = (Array.isArray(res.data) ? res.data : (res.data?.data || [])).map(assignment => ({
        ...assignment,
        // Ensure we have the nested class and subject objects
        class: assignment.class || { id: assignment.classId, name: 'Unknown Class' },
        subject: assignment.subject || { id: assignment.subjectId, name: 'Unknown Subject' }
      }));
      
      console.log('Processed assignments:', assignmentsData);
      setAssignments(assignmentsData);
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

  useEffect(() => {
    if (selectedAssignment) {
      fetchQuestions(selectedAssignment);
    }
  }, [selectedAssignment, fetchQuestions]);

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
      <AppBar position="static" color="default" sx={{ mb: 3, borderRadius: 1 }}>
        <Toolbar>
          <Tabs
            value={activeTab}
            onChange={(event, newValue) => {
              setActiveTab(newValue);
              localStorage.setItem('teacherActiveTab', newValue);
            }}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flexGrow: 1 }}
          >
            {tabs.map((tab) => (
              <Tab key={tab.id} value={tab.id} label={tab.label} icon={tab.icon} iconPosition="start" />
            ))}
          </Tabs>
          <IconButton 
            color="inherit" 
            onClick={handleLogout}
            aria-label="logout"
            sx={{ ml: 2 }}
          >
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        {activeTab === 'assignments' && (
          <Box>
            {loading.assignments ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : assignments.length === 0 ? (
              <Box textAlign="center" p={3}>
                <Typography variant="body1" color="textSecondary">
                  No assignments found. Please contact your administrator to be assigned to classes and subjects.
                </Typography>
              </Box>
            ) : (
              assignments.map((assignment) => (
                <Box key={assignment.id} mb={2}>
                  <AssignmentCard 
                    assignment={assignment}
                    onDelete={handleDelete}
                    onViewQuestions={() => setSelectedAssignment(assignment)}
                    onUploadQuestions={() => handleUploadQuestions(assignment)}
                  />
                </Box>
              ))
            )}
          </Box>
        )}
        {activeTab === 'students' && <StudentList students={students} loading={loading.students} />}
        {activeTab === 'analytics' && <AnalyticsChart data={analytics} loading={loadingAnalytics} onFetch={fetchAnalytics} assignments={assignments} />}
        {activeTab === 'profile' && (
          loading.profile ? <CircularProgress /> : 
          profile ? <ProfileCard user={profile} onUpdate={handleProfileUpdate} /> : <Typography>Could not load profile.</Typography>
        )}
      </Box>

      <Dialog open={!!editingQuestion} onClose={() => setEditingQuestion(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Question</DialogTitle>
        <DialogContent>
          <QuestionForm 
            question={currentQuestion} 
            setQuestion={setCurrentQuestion}
            onSave={handleEditSave} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingQuestion(null)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openUploadModal} onClose={() => setOpenUploadModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload Questions</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            style={{ margin: '20px 0' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadModal(false)}>Cancel</Button>
          <Button 
            onClick={handleUploadSubmit} 
            variant="contained" 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnack({ ...snack, open: false })} 
          severity={snack.severity}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TeacherPanel;
