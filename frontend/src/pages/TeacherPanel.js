import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, AppBar, Tabs, Tab, Typography, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Snackbar, Alert, useTheme, Toolbar, IconButton
} from '@mui/material';
import { 
  Assignment, People, BarChart, AccountCircle, Logout 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AssignmentCard from '../components/teacher/AssignmentCard';
import StudentList from '../components/teacher/StudentList';
import AnalyticsChart from '../components/teacher/AnalyticsChart';
import ProfileCard from '../components/common/ProfileCard';
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
  const [file, setFile] = useState(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', options: ['', '', '', ''], answer: '' });

  const tabs = [
    { id: 'assignments', label: 'Assignments & Questions', icon: <Assignment /> },
    { id: 'students', label: 'My Students', icon: <People /> },
    { id: 'analytics', label: 'Exam Analytics', icon: <BarChart /> },
    { id: 'profile', label: 'My Profile', icon: <AccountCircle /> },
  ];

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, assignments: true }));
      const res = await api.get('/teacher/assignments');
      setAssignments(res.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments.');
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

  const handleUpload = async () => {
    if (!file || !selectedAssignment) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post(`/teacher/assignments/${selectedAssignment}/questions/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Questions uploaded successfully!');
      fetchQuestions(selectedAssignment);
      setOpenUploadModal(false);
      setFile(null);
    } catch (error) {
      console.error('Error uploading questions:', error);
      toast.error('Failed to upload questions.');
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
      fetchQuestions(selectedAssignment);
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await api.delete(`/teacher/questions/${id}`);
      toast.success('Question deleted successfully!');
      fetchQuestions(selectedAssignment);
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question.');
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedAssignment) return;
    if (!window.confirm('Are you sure you want to delete all questions for this assignment?')) return;
    
    try {
      await api.delete(`/teacher/assignments/${selectedAssignment}/questions`);
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

      <Box>
        {activeTab === 'assignments' && (
          <Box>
            {assignments.map((assignment) => (
              <AssignmentCard 
                key={assignment.id} 
                assignment={assignment} 
                onDelete={handleDelete}
                onEdit={handleEdit}
                onViewQuestions={() => setSelectedAssignment(assignment.id)}
              />
            ))}
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
            onChange={(e) => setFile(e.target.files?.[0])}
            style={{ margin: '20px 0' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadModal(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!file}
          >
            Upload
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
