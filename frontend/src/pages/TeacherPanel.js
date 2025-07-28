import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, AppBar, Tabs, Tab, Typography, CircularProgress, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Snackbar, Alert, useTheme
} from '@mui/material';
import { 
  Assignment, People, BarChart, AccountCircle 
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import AssignmentCard from '../components/teacher/AssignmentCard';
import StudentList from '../components/teacher/StudentList';
import AnalyticsChart from '../components/teacher/AnalyticsChart';
import ProfileCard from '../components/common/ProfileCard';
import QuestionForm from '../components/teacher/QuestionForm';

function TeacherPanel() {
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

  const fetchStudents = useCallback(async (classId) => {
    if (!classId) return;
    try {
      setLoading(prev => ({ ...prev, students: true }));
      const res = await api.get(`/teacher/classes/${classId}/students`);
      setStudents(res.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students for the class.');
      setStudents([]);
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
      setQuestions([]);
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

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (selectedAssignment) {
      const assignment = assignments.find(a => a.id === selectedAssignment);
      if (assignment) {
        fetchStudents(assignment.class_id);
        fetchQuestions(selectedAssignment);
      }
    } else {
      setStudents([]);
      setQuestions([]);
    }
  }, [selectedAssignment, assignments, fetchStudents, fetchQuestions]);

  useEffect(() => {
    if (activeTab === 'profile' && !profile) {
      fetchProfile();
    }
  }, [activeTab, profile, fetchProfile]);

  const handleUpload = async () => {
    if (!file || !selectedAssignment) return;
    const formData = new FormData();
    formData.append('questions', file);

    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.post(`/teacher/assignments/${selectedAssignment}/questions/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchQuestions(selectedAssignment);
      setOpenUploadModal(false);
      setFile(null);
      toast.success('Questions uploaded successfully!');
    } catch (error) {
      console.error('Error uploading questions:', error);
      toast.error(error.response?.data?.message || 'Failed to upload questions.');
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleEdit = (question) => {
    setCurrentQuestion(question);
    setEditingQuestion(question.id);
  };

  const handleEditSave = async () => {
    if (!editingQuestion) return;
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.put(`/teacher/questions/${editingQuestion}`, currentQuestion);
      await fetchQuestions(selectedAssignment);
      setEditingQuestion(null);
      setSnack({ open: true, message: 'Question updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Error updating question:', error);
      setSnack({ open: true, message: error.response?.data?.message || 'Failed to update question', severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.delete(`/teacher/questions/${id}`);
      await fetchQuestions(selectedAssignment);
      setSnack({ open: true, message: 'Question deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting question:', error);
      setSnack({ open: true, message: error.response?.data?.message || 'Failed to delete question', severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedAssignment || !window.confirm('Are you sure you want to delete all questions? This action cannot be undone.')) return;
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.delete(`/teacher/assignments/${selectedAssignment}/questions`);
      setQuestions([]);
      setSnack({ open: true, message: 'All questions have been deleted', severity: 'success' });
    } catch (error) {
      console.error('Error deleting all questions:', error);
      setSnack({ open: true, message: error.response?.data?.message || 'Failed to delete questions', severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
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

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
      <AppBar position="static" color="default" sx={{ mb: 3, borderRadius: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            localStorage.setItem('teacherActiveTab', newValue);
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </AppBar>

      <Box>
        {activeTab === 'assignments' && (
          <AssignmentCard 
            assignments={assignments} 
            loading={loading.assignments}
            selectedAssignment={selectedAssignment}
            setSelectedAssignment={setSelectedAssignment}
            questions={questions}
            handleDeleteAll={handleDeleteAll}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
            handleUpload={handleUpload}
            setFile={setFile}
            openUploadModal={openUploadModal}
            setOpenUploadModal={setOpenUploadModal}
          />
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

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TeacherPanel;
