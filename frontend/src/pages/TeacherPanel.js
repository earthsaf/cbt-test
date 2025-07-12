// Only accessible by teachers. Teacher dashboard for managing exams, students, and analytics.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Divider, Grid, IconButton, Paper, Tab, Tabs, TextField, Typography, AppBar, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Radio, RadioGroup
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Upload as UploadIcon, 
  Download as DownloadIcon,
  Book,
  Group,
  Analytics
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { es } from 'date-fns/locale';
import QuestionForm from '../components/QuestionForm';
import QuestionList from '../components/QuestionList';
import ProfileCard from '../components/ProfileCard';
import AssignmentCard from '../components/AssignmentCard';
import StudentList from '../components/StudentList';
import AnalyticsChart from '../components/AnalyticsChart';

const tabs = [
  { id: 'assignments', label: 'My Assignments', icon: <Book /> },
  { id: 'students', label: 'My Students', icon: <Group /> },
  { id: 'analytics', label: 'Analytics', icon: <Analytics /> }
];

function TeacherPanel() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacherActiveTab') || 'assignments');
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [file, setFile] = useState(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState({ a: '', b: '', c: '', d: '' });
  const [editAnswer, setEditAnswer] = useState('');
  
  const [loading, setLoading] = useState({
    assignments: false,
    students: false,
    analytics: false,
    questions: false
  });
  
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  
  // Question management state
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: { a: '', b: '', c: '', d: '' },
    answer: ''
  });
  const [activeStep, setActiveStep] = useState(0); // 0: select assignment, 1: add questions

  useEffect(() => {
    // Check authentication
    if (user === null) {
      // Still loading user data
      return;
    }

    if (!user || user.role !== 'teacher') {
      navigate('/login');
      return;
    }

    // Fetch teacher-specific data
    const fetchTeacherData = async () => {
      try {
        setLoading(prev => ({ ...prev, assignments: true }));
        
        // Fetch teacher's assignments and students in parallel
        const [assignmentsRes, studentsRes] = await Promise.all([
          api.get('/admin/my-assignments').catch(err => {
            console.error('Error fetching assignments:', err);
            return { data: [] }; // Return empty array if endpoint fails
          }),
          api.get('/users?role=student').catch(err => {
            console.error('Error fetching students:', err);
            return { data: [] }; // Return empty array if endpoint fails
          })
        ]);

        console.log('Assignments data:', assignmentsRes.data);
        
        // Transform assignments data to match expected format
        const formattedAssignments = Array.isArray(assignmentsRes.data) 
          ? assignmentsRes.data.map(assignment => ({
              ...assignment,
              id: assignment.id,
              classId: assignment.Class?.id,
              className: assignment.Class?.name,
              subjectId: assignment.Subject?.id,
              subjectName: assignment.Subject?.name,
              exams: assignment.exams || []
            }))
          : [];
          
        setAssignments(formattedAssignments);
        setStudents(studentsRes.data || []);
      } catch (error) {
        console.error('Error in fetchTeacherData:', error);
        toast.error('Error loading teacher data. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, assignments: false }));
      }
    };

    fetchTeacherData();
  }, [navigate, user, t]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(prev => ({ ...prev, questions: true }));
      const response = await api.post('/admin/upload-questions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Questions uploaded successfully');
      setOpenUploadModal(false);
      setFile(null);
      if (selectedAssignment) {
        await fetchQuestions(selectedAssignment);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Error uploading questions';
      toast.error(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const fetchAnalytics = async (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return setSnack({ open: true, message: 'Select an assignment', severity: 'info' });
    setLoadingAnalytics(true);
    try {
      const res = await api.get(`/exams/${assignment.examId}/analytics`);
      setAnalytics(res.data);
    } catch {
      setSnack({ open: true, message: 'Failed to fetch analytics', severity: 'error' });
      setAnalytics(null);
    }
    setLoadingAnalytics(false);
  };

  const fetchQuestions = async (assignmentId) => {
    if (!assignmentId) return setQuestions([]);
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      const res = await api.get(`/admin/assignment-questions/${assignmentId}`);
      setQuestions(res.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setSnack({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to load questions', 
        severity: 'error' 
      });
      setQuestions([]);
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  useEffect(() => {
    if (selectedAssignment) fetchQuestions(selectedAssignment);
    else setQuestions([]);
  }, [selectedAssignment]);

  const handleEdit = (question) => {
    setEditingQuestion(question.id);
    setEditText(question.text);
    setEditOptions(question.options || { a: '', b: '', c: '', d: '' });
    setEditAnswer(question.answer || '');
  };

  const handleEditSave = async () => {
    if (!editingQuestion) return;
    
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.put(`/admin/questions/${editingQuestion}`, {
        text: editText,
        options: editOptions,
        answer: editAnswer
      });
      
      // Refresh questions
      const res = await api.get(`/admin/assignment-questions/${selectedAssignment}`);
      setQuestions(res.data || []);
      
      setEditingQuestion(null);
      setSnack({
        open: true,
        message: 'Question updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating question:', error);
      setSnack({
        open: true,
        message: error.response?.data?.message || 'Failed to update question',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.delete(`/admin/questions/${id}`);
      
      // Refresh questions
      const res = await api.get(`/admin/assignment-questions/${selectedAssignment}`);
      setQuestions(res.data || []);
      
      setSnack({
        open: true,
        message: 'Question deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      setSnack({
        open: true,
        message: error.response?.data?.message || 'Failed to delete question',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all questions? This action cannot be undone.')) return;
    
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.delete(`/admin/assignment-questions/${selectedAssignment}`);
      
      setQuestions([]);
      setSnack({
        open: true,
        message: 'All questions have been deleted',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting all questions:', error);
      setSnack({
        open: true,
        message: error.response?.data?.message || 'Failed to delete questions',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleAddQuestion = async () => {
    if (!currentQuestion.text || !currentQuestion.options.a || !currentQuestion.options.b || 
        !currentQuestion.options.c || !currentQuestion.options.d || !currentQuestion.answer) {
      setSnack({ 
        open: true, 
        message: 'Please fill in all fields', 
        severity: 'error' 
      });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      await api.post(`/admin/assignment-questions/${selectedAssignment}`, {
        text: currentQuestion.text,
        options: currentQuestion.options,
        answer: currentQuestion.answer
      });
      
      // Reset form
      setCurrentQuestion({
        text: '',
        options: { a: '', b: '', c: '', d: '' },
        answer: ''
      });
      
      // Refresh questions
      const res = await api.get(`/admin/assignment-questions/${selectedAssignment}`);
      setQuestions(res.data || []);
      
      setSnack({ 
        open: true, 
        message: 'Question added successfully', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error adding question:', error);
      setSnack({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to add question', 
        severity: 'error' 
      });
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <AppBar position="static" color="default" elevation={1}>
        <Tabs
          value={localStorage.getItem('teacherActiveTab') || activeTab}
          onChange={(event, newValue) => {
            localStorage.setItem('teacherActiveTab', newValue);
            setActiveTab(newValue);
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-around',
            },
          }}
        >
          <Tab value="assignments" label="Assignments" icon={<Book />} iconPosition="start" sx={{ minHeight: 64 }} />
          <Tab value="students" label="Students" icon={<Book />} iconPosition="start" sx={{ minHeight: 64 }} />
          <Tab value="analytics" label="Analytics" icon={<Book />} iconPosition="start" sx={{ minHeight: 64 }} />
        </Tabs>
      </AppBar>
      <Box sx={{ mt: 3 }}>
        {activeTab === 'assignments' && (
          <Box>
            <Typography variant="h6">My Assignments</Typography>
            <ul>
              {assignments.map(a => (
                <li key={a.id}>{a.Class?.name} - {a.Subject?.name}</li>
              ))}
            </ul>
            {activeStep === 0 && (
              <Card sx={{ p: 4, mb: 3, boxShadow: 3, maxWidth: 600, mx: 'auto' }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Book sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>Add Questions</Typography>
                  <Typography color="text.secondary" sx={{ mb: 4 }}>
                    Select an assignment to start adding questions
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Select 
                    fullWidth
                    value={selectedAssignment} 
                    onChange={e => setSelectedAssignment(e.target.value)} 
                    displayEmpty
                    size="large"
                    sx={{ mb: 3 }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select an assignment</em>
                    </MenuItem>
                    {assignments.map(a => (
                      <MenuItem value={a.id} key={a.id}>
                        <Box>
                          <Typography>{a.Class?.name} - {a.Subject?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {a.questions?.length || 0} questions
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>

                  <Button 
                    fullWidth 
                    variant="contained" 
                    size="large"
                    onClick={() => setActiveStep(1)}
                    disabled={!selectedAssignment}
                    sx={{ py: 1.5, fontSize: '1.1rem' }}
                  >
                    Continue to Add Questions
                  </Button>
                </Box>
              </Card>
            )}

            {activeStep === 1 && (
              <Card sx={{ p: 0, mb: 3, boxShadow: 3, maxWidth: 800, mx: 'auto' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => setActiveStep(0)} sx={{ mr: 2 }}>
                      <ArrowBack />
                    </IconButton>
                    <Box>
                      <Typography variant="h6">
                        {assignments.find(a => a.id === selectedAssignment)?.Class?.name} - 
                        {assignments.find(a => a.id === selectedAssignment)?.Subject?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {questions.length} questions added
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Questions List */}
                <Box sx={{ maxHeight: '400px', overflowY: 'auto', p: 2 }}>
                  {questions.map((q, idx) => (
                    <Card key={q.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                            Q{idx + 1}. {q.text}
                          </Typography>
                          <Box sx={{ pl: 2, mb: 1 }}>
                            {['a', 'b', 'c', 'd'].map(opt => (
                              <Typography 
                                key={opt} 
                                variant="body2" 
                                sx={{ 
                                  color: q.answer === opt ? 'success.main' : 'text.primary',
                                  fontWeight: q.answer === opt ? 600 : 'normal'
                                }}
                              >
                                {opt.toUpperCase()}. {q.options?.[opt] || ''}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(q.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>

                {/* Add Question Form */}
                <Box sx={{ p: 3, borderTop: '1px solid #eee' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                    Add New Question
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Type your question here..."
                    value={currentQuestion.text}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                    sx={{ mb: 2 }}
                  />

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <Grid item xs={12} sm={6} key={opt}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            bgcolor: 'primary.main',
                            mr: 1
                          }} />
                        </Box>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label={`Option ${opt.toUpperCase()}`} 
                          value={currentQuestion.options[opt]} 
                          onChange={e => setCurrentQuestion({ ...currentQuestion, options: { ...currentQuestion.options, [opt]: e.target.value } })}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary', minWidth: '24px' }}>
                                {opt.toUpperCase()}.
                              </Typography>
                            ),
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Select 
                    fullWidth
                    value={currentQuestion.answer || ''}
                    onChange={e => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                    displayEmpty
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="">
                      <em>Select correct answer</em>
                    </MenuItem>
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <MenuItem value={opt} key={opt}>
                        Option {opt.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                  
                  <Button 
                    variant="contained" 
                    onClick={handleAddQuestion}
                    disabled={!currentQuestion.text || !currentQuestion.options.a || !currentQuestion.options.b || !currentQuestion.options.c || !currentQuestion.options.d || !currentQuestion.answer}
                    fullWidth
                  >
                    Add Question
                  </Button>
                </Box>
              </Card>
            )}
          </Box>
        )}
        {activeTab === 'students' && (
          <Box>
            <Typography variant="h6">My Students</Typography>
            <ul>
              {students.map(s => <li key={s.id}>{s.username} ({s.email})</li>)}
            </ul>
          </Box>
        )}
        {activeTab === 'analytics' && (
          <Box>
            <Typography variant="h6">Analytics</Typography>
            <Select value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)} displayEmpty style={{ minWidth: 200, marginBottom: 8 }}>
              <MenuItem value="">Select Assignment</MenuItem>
              {assignments.map(a => (
                <MenuItem value={a.id} key={a.id}>{a.Class?.name} - {a.Subject?.name}</MenuItem>
              ))}
            </Select>
            <Button onClick={() => fetchAnalytics(selectedAssignment)} disabled={!selectedAssignment || loadingAnalytics}>View Analytics</Button>
            {loadingAnalytics && <Typography>Loading...</Typography>}
            {analytics && (
              <Box sx={{ mt: 3 }}>
                <Bar data={{
                  labels: analytics.results.map(r => r.user),
                  datasets: [{
                    label: 'Scores',
                    data: analytics.results.map(r => r.score),
                    backgroundColor: '#1976d2',
                  }],
                }} />
                <Box sx={{ mt: 2 }}>
                  <Typography>Highest: {analytics.highest}, Lowest: {analytics.lowest}, Average: {analytics.avg}</Typography>
                  {analytics.mostFailedQuestion && (
                    <Typography>Most Failed Question: {analytics.mostFailedQuestion.text} (Failed {analytics.mostFailedQuestion.fails} times)</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
      {/* Preview and edit questions */}
      {questions.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Preview Questions</Typography>
          <Button color="error" onClick={handleDeleteAll} sx={{ mb: 2 }}>Delete All</Button>
          {questions.map(q => (
            <Card key={q.id} sx={{ mb: 2 }}>
              <CardContent>
                {editingQuestion === q.id ? (
                  <>
                    <TextField label="Question" fullWidth value={editText} onChange={e => setEditText(e.target.value)} sx={{ mb: 1 }} />
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <TextField key={opt} label={opt.toUpperCase()} value={editOptions[opt]} onChange={e => setEditOptions({ ...editOptions, [opt]: e.target.value })} sx={{ mr: 1, mb: 1 }} />
                    ))}
                    <TextField label="Answer" value={editAnswer} onChange={e => setEditAnswer(e.target.value)} sx={{ mb: 1 }} />
                    <Button onClick={handleEditSave} variant="contained" sx={{ mr: 1 }}>Save</Button>
                    <Button onClick={() => setEditingQuestion(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Typography><b>{q.text}</b></Typography>
                    <Typography>a. {q.options?.a}  b. {q.options?.b}  c. {q.options?.c}  d. {q.options?.d}</Typography>
                    <Typography>Answer: {q.answer}</Typography>
                    <Button onClick={() => handleEdit(q)} sx={{ mr: 1 }}>Edit</Button>
                    <Button color="error" onClick={() => handleDelete(q.id)}>Delete</Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TeacherPanel;