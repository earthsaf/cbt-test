// Only accessible by teachers. Teacher dashboard for managing exams, students, and analytics.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AppBar, Tabs, Tab, Box, Typography, Card, CardContent, Button, Grid, Snackbar, Alert, Select, MenuItem, TextField, 
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Modal, Backdrop, Fade, 
  CircularProgress, Stack, AlertTitle, Avatar, Chip, Divider } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { 
  Upload, 
  Edit, 
  Delete, 
  Add, 
  Person, 
  Analytics, 
  Book, 
  Group 
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
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
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState({
    assignments: false,
    students: false,
    analytics: false,
    questions: false
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  
  // Question management
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualQuestions, setManualQuestions] = useState([]);
  const [newQ, setNewQ] = useState({
    text: '',
    options: { a: '', b: '', c: '', d: '' },
    answer: ''
  });
  
  // Modal states
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [openQuestionModal, setOpenQuestionModal] = useState(false);
  const [openAnalyticsModal, setOpenAnalyticsModal] = useState(false);
  const [file, setFile] = useState(null);
  
  // Question editing
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState({ a: '', b: '', c: '', d: '' });
  const [editAnswer, setEditAnswer] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!user || user.role !== 'teacher') {
      navigate('/login');
      return;
    }

    // Fetch teacher-specific data
    const fetchTeacherData = async () => {
      try {
        setLoading({ ...loading, assignments: true });
        const [assignmentsRes, studentsRes] = await Promise.all([
          api.get('/admin/teacher-assignments'),
          api.get('/admin/users')
        ]);

        setAssignments(assignmentsRes.data.filter(a => a.teacher?.id === user.id));
        setStudents(studentsRes.data.filter(u => u.role === 'student'));
      } catch (error) {
        toast.error(t('error.fetching_data'));
      } finally {
        setLoading({ ...loading, assignments: false, students: false });
      }
    };

    fetchTeacherData();
  }, [navigate, user]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedAssignment || !file) {
      toast.error(t('error.no_file_selected'));
      return;
    }

    try {
      setLoading({ ...loading, questions: true });
      const formData = new FormData();
      formData.append('assignmentId', selectedAssignment);
      formData.append('file', file);
      
      await api.post('/admin/upload-questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          toast.info(`Uploading... ${percentCompleted}%`);
        }
      });

      toast.success(t('success.questions_uploaded'));
      setOpenUploadModal(false);
      setFile(null);
      setSelectedAssignment('');
      fetchQuestions(selectedAssignment);
    } catch (error) {
      toast.error(t('error.upload_failed'));
    } finally {
      setLoading({ ...loading, questions: false });
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
    const res = await api.get(`/admin/assignment-questions/${assignmentId}`);
    setQuestions(res.data);
  };

  useEffect(() => {
    if (selectedAssignment) fetchQuestions(selectedAssignment);
    else setQuestions([]);
  }, [selectedAssignment]);

  const handleEdit = (q) => {
    setEditingQuestion(q.id);
    setEditText(q.text);
    setEditOptions(q.options || { a: '', b: '', c: '', d: '' });
    setEditAnswer(q.answer || '');
  };

  const handleEditSave = async () => {
    await api.put(`/admin/questions/${editingQuestion}`, {
      text: editText,
      options: editOptions,
      answer: editAnswer,
    });
    setEditingQuestion(null);
    fetchQuestions(selectedAssignment);
    setSnack({ open: true, message: 'Question updated', severity: 'success' });
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/questions/${id}`);
    fetchQuestions(selectedAssignment);
    setSnack({ open: true, message: 'Question deleted', severity: 'success' });
  };

  const handleDeleteAll = async () => {
    await api.delete(`/admin/assignment-questions/${selectedAssignment}`);
    fetchQuestions(selectedAssignment);
    setSnack({ open: true, message: 'All questions deleted', severity: 'success' });
  };

  const handleAddManualQuestion = () => {
    if (!newQ.text || !newQ.options.a || !newQ.options.b || !newQ.options.c || !newQ.options.d || !newQ.answer) return;
    setManualQuestions([...manualQuestions, newQ]);
    setNewQ({ text: '', options: { a: '', b: '', c: '', d: '' }, answer: '' });
  };

  const handleRemoveManualQuestion = idx => {
    setManualQuestions(manualQuestions.filter((_, i) => i !== idx));
  };

  const handleSubmitManualQuestions = async () => {
    if (!selectedAssignment || manualQuestions.length === 0) return;
    setSubmittingManual(true);
    try {
      await api.post(`/admin/assignment-questions/${selectedAssignment}`, { questions: manualQuestions });
      setSnack({ open: true, message: 'Questions added!', severity: 'success' });
      setManualQuestions([]);
      fetchQuestions(selectedAssignment);
      setShowManualForm(false);
    } catch {
      setSnack({ open: true, message: 'Failed to add questions', severity: 'error' });
    }
    setSubmittingManual(false);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <AppBar position="static" color="default">
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          sx={{
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-around',
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab 
              key={tab.id}
              value={tab.id}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          ))}
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
            <Card sx={{ p: 3, mb: 3, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>Upload Questions</Typography>
              
              <Box sx={{ mb: 3, p: 3, border: '2px dashed #bdbdbd', borderRadius: 2, textAlign: 'center', bgcolor: 'background.paper' }} 
                   onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                   onDrop={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                       setFile(e.dataTransfer.files[0]);
                     }
                   }}
              >
                <Upload sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  <strong>Drag & drop your file here</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  or
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ textTransform: 'none' }}
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </Button>
                {file && (
                  <Typography variant="body2" sx={{ mt: 2, color: 'success.main' }}>
                    <strong>Selected:</strong> {file.name}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Select Assignment</Typography>
                <Select 
                  fullWidth
                  value={selectedAssignment} 
                  onChange={e => setSelectedAssignment(e.target.value)} 
                  displayEmpty
                  size="small"
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="">
                    <em>Select an assignment</em>
                  </MenuItem>
                  {assignments.map(a => (
                    <MenuItem value={a.id} key={a.id}>
                      {a.Class?.name} - {a.Subject?.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Button 
                fullWidth 
                variant="contained" 
                onClick={handleUpload}
                disabled={!selectedAssignment || !file}
                size="large"
                startIcon={<Upload />}
              >
                Upload Questions
              </Button>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">OR</Typography>
              </Divider>

              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => setShowManualForm(v => !v)} 
                disabled={!selectedAssignment}
                startIcon={<Add />}
              >
                {showManualForm ? 'Hide Manual Entry' : 'Add Questions Manually'}
              </Button>
            </Card>
            {showManualForm && (
              <Card sx={{ mt: 2, p: 3, boxShadow: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>Add Questions Manually</Typography>
                
                <Box sx={{ mb: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>New Question</Typography>
                  <TextField 
                    label="Question Text" 
                    fullWidth 
                    value={newQ.text} 
                    onChange={e => setNewQ({ ...newQ, text: e.target.value })} 
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <Grid item xs={12} sm={6} key={opt}>
                        <TextField 
                          fullWidth
                          label={`Option ${opt.toUpperCase()}`} 
                          value={newQ.options[opt]} 
                          onChange={e => setNewQ({ ...newQ, options: { ...newQ.options, [opt]: e.target.value } })}
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
                    value={newQ.answer || ''}
                    onChange={e => setNewQ({ ...newQ, answer: e.target.value })}
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
                    onClick={handleAddManualQuestion}
                    disabled={!newQ.text || !newQ.options.a || !newQ.options.b || !newQ.options.c || !newQ.options.d || !newQ.answer}
                    fullWidth
                  >
                    Add Question
                  </Button>
                </Box>
                
                {manualQuestions.length > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">Questions to Add ({manualQuestions.length})</Typography>
                      <Button 
                        variant="contained" 
                        color="success" 
                        onClick={handleSubmitManualQuestions} 
                        disabled={submittingManual}
                        startIcon={<Upload />}
                      >
                        {submittingManual ? 'Submitting...' : 'Submit All Questions'}
                      </Button>
                    </Box>
                    
                    <Grid container spacing={2}>
                      {manualQuestions.map((q, idx) => (
                        <Grid item xs={12} sm={6} key={idx}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>
                                  Question {idx + 1}
                                </Typography>
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => handleRemoveManualQuestion(idx)}
                                  sx={{ mt: -1, mr: -1 }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{q.text}</Typography>
                              <Box sx={{ pl: 1 }}>
                                {Object.entries(q.options).map(([opt, text]) => (
                                  <Typography 
                                    key={opt} 
                                    variant="body2" 
                                    sx={{ 
                                      color: q.answer === opt ? 'success.main' : 'text.primary',
                                      fontWeight: q.answer === opt ? 600 : 'normal',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      mb: 0.5
                                    }}
                                  >
                                    <Box component="span" sx={{ minWidth: '24px' }}>{opt.toUpperCase()}.</Box>
                                    <Box component="span">{text}</Box>
                                  </Typography>
                                ))}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
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