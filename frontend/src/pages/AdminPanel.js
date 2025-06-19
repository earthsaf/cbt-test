// Only accessible by admin. Management controls for users, exams, invigilator codes, analytics.
import React, { useState, useEffect } from 'react';
import { AppBar, Tabs, Tab, Box, Typography, Card, CardContent, Button, Grid, TextField, Select, MenuItem, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, DialogContentText } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

const tabs = ['Users', 'Classes', 'Exams', 'Subjects', 'Assignments'];

function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get('tab')) || 0;
  const [tab, setTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);
  const [retakeExam, setRetakeExam] = useState({ examId: '', classId: '', userId: '' });
  const [analytics, setAnalytics] = useState({ results: [], highest: 0, lowest: 0, avg: 0 });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student', name: '', email: '', classId: '', telegramId: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [invigilatorCodes, setInvigilatorCodes] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ teacherId: '', classId: '', subjectId: '' });
  const [fileError, setFileError] = useState('');
  const [file, setFile] = useState(null);
  const [newClass, setNewClass] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [examClass, setExamClass] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examSettings, setExamSettings] = useState({ scramble: false, durationMinutes: 60 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('role') !== 'admin') {
      navigate('/login');
      setSnack({ open: true, message: 'You must be signed in as admin.', severity: 'error' });
    }
  }, [navigate]);

  useEffect(() => {
    setSearchParams({ tab });
  }, [tab, setSearchParams]);

  useEffect(() => {
    api.get('/admin/users').then(res => setUsers(res.data)).catch(() => setUsers([]));
    api.get('/admin/classes').then(res => setClasses(res.data)).catch(() => setClasses([]));
    api.get('/admin/exams').then(res => setExams(res.data)).catch(() => setExams([]));
    api.get('/admin/subjects').then(res => setSubjects(res.data)).catch(() => setSubjects([]));
    api.get('/admin/teacher-assignments').then(res => setAssignments(res.data)).catch(() => setAssignments([]));
  }, []);

  useEffect(() => {
    api.get(`/admin/exams?search=${encodeURIComponent(examSearch)}&classId=${examClass}&subjectId=${examSubject}`)
      .then(res => setExams(res.data)).catch(() => setExams([]));
  }, [examSearch, examClass, examSubject]);

  const handleEditUser = async () => {
    try {
      await api.put(`/admin/users/${editUser.id}`, {
        name: editUser.username,
        email: editUser.email,
        classId: editUser.classId,
      });
      setSnack({ open: true, message: 'User updated', severity: 'success' });
      setEditUser(null);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      setSnack({ open: true, message: 'Failed to update user', severity: 'error' });
    }
  };

  const handleEditQuestion = async () => {
    try {
      await api.put(`/admin/exams/${editQuestion.examId}/questions/${editQuestion.id}`, {
        text: editQuestion.text,
        options: editQuestion.options,
        answer: editQuestion.answer,
      });
      setSnack({ open: true, message: 'Question updated', severity: 'success' });
      setEditQuestion(null);
    } catch {
      setSnack({ open: true, message: 'Failed to update question', severity: 'error' });
    }
  };

  const handleRetake = async () => {
    try {
      await api.post('/admin/retake', {
        examId: retakeExam.examId,
        classId: retakeExam.classId || undefined,
        userId: retakeExam.userId || undefined,
      });
      setSnack({ open: true, message: 'Retake triggered', severity: 'success' });
      setRetakeExam({ examId: '', classId: '', userId: '' });
    } catch {
      setSnack({ open: true, message: 'Failed to trigger retake', severity: 'error' });
    }
  };

  const fetchAnalytics = async (examId) => {
    try {
      const res = await api.get(`/admin/exams/${examId}/results`);
      setAnalytics(res.data);
    } catch {
      setAnalytics({ results: [], highest: 0, lowest: 0, avg: 0 });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.post('/admin/users', newUser);
      setSnack({ open: true, message: 'User created', severity: 'success' });
      setNewUser({ username: '', password: '', role: 'student', name: '', email: '', classId: '', telegramId: '' });
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      setSnack({ open: true, message: 'Failed to create user', severity: 'error' });
    }
    setCreatingUser(false);
  };

  const handleGetInvigilatorCode = async (examId) => {
    try {
      const res = await api.get('/admin/exams/invigilator-code', { params: { examId } });
      setInvigilatorCodes(c => ({ ...c, [examId]: res.data.code }));
    } catch {
      setSnack({ open: true, message: 'Failed to get code', severity: 'error' });
    }
  };

  const handleGenerateInvigilatorCode = async (examId) => {
    try {
      const res = await api.post('/admin/exams/invigilator-code', { examId });
      setInvigilatorCodes(c => ({ ...c, [examId]: res.data.code }));
      setSnack({ open: true, message: 'Code generated', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to generate code', severity: 'error' });
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject) return;
    try {
      await api.post('/admin/subjects', { name: newSubject });
      setSnack({ open: true, message: 'Subject added', severity: 'success' });
      setNewSubject('');
      const res = await api.get('/admin/subjects');
      setSubjects(res.data);
    } catch {
      setSnack({ open: true, message: 'Failed to add subject', severity: 'error' });
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      await api.delete(`/admin/subjects/${id}`);
      setSnack({ open: true, message: 'Subject deleted', severity: 'success' });
      setSubjects(subjects.filter(s => s.id !== id));
    } catch {
      setSnack({ open: true, message: 'Failed to delete subject', severity: 'error' });
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/teacher-assignments', newAssignment);
      setSnack({ open: true, message: 'Assignment added', severity: 'success' });
      setNewAssignment({ teacherId: '', classId: '', subjectId: '' });
      const res = await api.get('/admin/teacher-assignments');
      setAssignments(res.data);
    } catch {
      setSnack({ open: true, message: 'Failed to add assignment', severity: 'error' });
    }
  };

  const handleDeleteAssignment = async (id) => {
    try {
      await api.delete(`/admin/teacher-assignments/${id}`);
      setSnack({ open: true, message: 'Assignment deleted', severity: 'success' });
      setAssignments(assignments.filter(a => a.id !== id));
    } catch {
      setSnack({ open: true, message: 'Failed to delete assignment', severity: 'error' });
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'txt' && ext !== 'docx') {
      setFileError('Only .txt or .docx files are allowed');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(f);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass) return;
    try {
      await api.post('/admin/classes', { name: newClass });
      setSnack({ open: true, message: 'Class added', severity: 'success' });
      setNewClass('');
      const res = await api.get('/admin/classes');
      setClasses(res.data);
    } catch {
      setSnack({ open: true, message: 'Failed to add class', severity: 'error' });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    // TODO: Implement file upload logic for assignments if needed
    setSnack({ open: true, message: 'File upload not implemented yet.', severity: 'info' });
  };

  const openExamModal = async (exam) => {
    setSelectedExam(exam);
    setExamSettings({
      scramble: !!exam.scramble,
      durationMinutes: exam.durationMinutes || 60,
    });
    const res = await api.get(`/admin/exams/${exam.id}/questions`);
    setExamQuestions(res.data);
  };

  const handleStartExam = async () => {
    setSavingSettings(true);
    try {
      const now = new Date().toISOString();
      await api.put(`/admin/exams/${selectedExam.id}/settings`, {
        startTime: now,
        durationMinutes: Number(examSettings.durationMinutes) || 60,
        scramble: examSettings.scramble,
      });
      setSnack({ open: true, message: 'Exam started!', severity: 'success' });
      setSelectedExam(null);
      api.get(`/admin/exams?search=${encodeURIComponent(examSearch)}&classId=${examClass}&subjectId=${examSubject}`)
        .then(res => setExams(res.data)).catch(() => setExams([]));
    } catch {
      setSnack({ open: true, message: 'Failed to start exam', severity: 'error' });
    }
    setSavingSettings(false);
  };

  const handleResetExam = async () => {
    setResetting(true);
    try {
      await api.put(`/admin/exams/${selectedExam.id}/settings`, {
        startTime: null
      });
      setSnack({ open: true, message: 'Exam reset! You can now start it again.', severity: 'success' });
      setShowResetConfirm(false);
      // Refresh exam list and modal
      const res = await api.get('/admin/exams');
      setExams(res.data);
      setSelectedExam(res.data.find(e => e.id === selectedExam.id));
    } catch {
      setSnack({ open: true, message: 'Failed to reset exam', severity: 'error' });
    }
    setResetting(false);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <AppBar position="static" color="default">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {tabs.map((t, i) => <Tab label={t} key={i} />)}
        </Tabs>
      </AppBar>
      <Box sx={{ mt: 3 }}>
        {tab === 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Create User</Typography>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <TextField label="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required size="small" />
              <TextField label="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required size="small" />
              <TextField label="Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} size="small" />
              <TextField label="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} size="small" />
              {newUser.role === 'teacher' && <TextField label="Telegram ID" value={newUser.telegramId} onChange={e => setNewUser({ ...newUser, telegramId: e.target.value })} size="small" required />}
              <Select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} size="small">
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
              </Select>
              <Select value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} size="small" displayEmpty>
                <MenuItem value="">Class</MenuItem>
                {classes.map(c => <MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>)}
              </Select>
              <Button type="submit" variant="contained" disabled={creatingUser}>Create</Button>
            </form>
          </Box>
        )}
        {users.map(user => (
          <Grid item xs={12} md={6} key={user.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{user.username}</Typography>
                <Typography>Email: {user.email}</Typography>
                <Typography>Class: {user.Class ? user.Class.name : ''}</Typography>
                <Button sx={{ mt: 1 }} onClick={() => setEditUser(user)}>Edit</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {tab === 1 && (
          <Box>
            <Typography variant="h6">Classes</Typography>
            <form onSubmit={handleAddClass} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <TextField value={newClass} onChange={e => setNewClass(e.target.value)} placeholder="Add class" size="small" />
              <Button type="submit" variant="contained">Add</Button>
            </form>
            <ul>
              {classes.map(c => <li key={c.id}>{c.name}</li>)}
            </ul>
          </Box>
        )}
        {tab === 2 && (
          <Box>
            <Typography variant="h6">Exams</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField label="Search" value={examSearch} onChange={e => setExamSearch(e.target.value)} size="small" />
              <Select value={examClass} onChange={e => setExamClass(e.target.value)} displayEmpty size="small" sx={{ minWidth: 120 }}>
                <MenuItem value="">All Classes</MenuItem>
                {classes.map(c => <MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>)}
              </Select>
              <Select value={examSubject} onChange={e => setExamSubject(e.target.value)} displayEmpty size="small" sx={{ minWidth: 120 }}>
                <MenuItem value="">All Subjects</MenuItem>
                {subjects.map(s => <MenuItem value={s.id} key={s.id}>{s.name}</MenuItem>)}
              </Select>
            </Box>
            <Grid container spacing={2}>
              {exams.map(exam => (
                <Grid item xs={12} md={6} key={exam.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{exam.title}</Typography>
                      <Typography>Class: {exam.Class ? exam.Class.name : ''}</Typography>
                      <Typography>Subject: {exam.Subject ? exam.Subject.name : ''}</Typography>
                      <Typography>Status: {exam.status}</Typography>
                      <Button sx={{ mt: 1 }} variant="outlined" onClick={() => openExamModal(exam)}>View / Set Exam</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Dialog open={!!selectedExam} onClose={() => setSelectedExam(null)} maxWidth="md" fullWidth>
              <DialogTitle>Exam Settings: {selectedExam?.title}</DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Time Limit (minutes)"
                    type="number"
                    value={examSettings.durationMinutes}
                    onChange={e => setExamSettings(s => ({ ...s, durationMinutes: e.target.value }))}
                    sx={{ mr: 2 }}
                    inputProps={{ min: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch checked={examSettings.scramble} onChange={e => setExamSettings(s => ({ ...s, scramble: e.target.checked }))} />}
                    label="Scramble Questions"
                  />
                </Box>
                <Typography variant="subtitle1">Questions (read-only):</Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 2, p: 2 }}>
                  {examQuestions.map((q, idx) => (
                    <Box key={q.id} sx={{ mb: 2 }}>
                      <Typography><b>{idx + 1}. {q.text}</b></Typography>
                      <Typography>a. {q.options?.a}  b. {q.options?.b}  c. {q.options?.c}  d. {q.options?.d}</Typography>
                      <Typography>Answer: {q.answer}</Typography>
                    </Box>
                  ))}
                  {examQuestions.length === 0 && <Typography>No questions for this exam.</Typography>}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedExam(null)}>Close</Button>
                <Button variant="contained" color="success" onClick={handleStartExam} disabled={savingSettings || selectedExam?.startTime}>Start Exam</Button>
                <Button variant="outlined" color="error" onClick={() => setShowResetConfirm(true)} disabled={resetting}>Reset Exam</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
        {tab === 3 && (
          <Box>
            <Typography variant="h6">Subjects</Typography>
            <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Add subject" style={{ flex: 1 }} />
              <Button type="submit" variant="contained">Add</Button>
            </form>
            <ul>
              {subjects.map(s => (
                <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.name}
                  <Button size="small" color="error" onClick={() => handleDeleteSubject(s.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          </Box>
        )}
        {tab === 4 && (
          <Box>
            <Typography variant="h6">Teacher-Class-Subject Assignments</Typography>
            <form onSubmit={handleAssignTeacher} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Select value={newAssignment.teacherId} onChange={e => setNewAssignment({ ...newAssignment, teacherId: e.target.value })} displayEmpty style={{ minWidth: 120 }}>
                <MenuItem value="">Teacher</MenuItem>
                {users.filter(u => u.role === 'teacher').map(u => <MenuItem value={u.id} key={u.id}>{u.name || u.username}</MenuItem>)}
              </Select>
              <Select value={newAssignment.classId} onChange={e => setNewAssignment({ ...newAssignment, classId: e.target.value })} displayEmpty style={{ minWidth: 120 }}>
                <MenuItem value="">Class</MenuItem>
                {classes.map(c => <MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>)}
              </Select>
              <Select value={newAssignment.subjectId} onChange={e => setNewAssignment({ ...newAssignment, subjectId: e.target.value })} displayEmpty style={{ minWidth: 120 }}>
                <MenuItem value="">Subject</MenuItem>
                {subjects.map(s => <MenuItem value={s.id} key={s.id}>{s.name}</MenuItem>)}
              </Select>
              <Button type="submit" variant="contained">Assign</Button>
            </form>
            {/*
            <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input type="file" onChange={handleFileChange} />
              {fileError && <Typography color="error">{fileError}</Typography>}
            </form>
            */}
            <ul>
              {assignments.map(a => (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {a.teacher?.name || a.teacher?.username} - {a.Class?.name} - {a.Subject?.name}
                  <Button size="small" color="error" onClick={() => handleDeleteAssignment(a.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Box>
      {/* Edit user dialog */}
      {editUser && (
        <Box sx={{ position: 'fixed', top: 100, left: 0, right: 0, mx: 'auto', width: 400, bgcolor: '#fff', p: 3, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6">Edit User</Typography>
          <TextField label="Name" fullWidth sx={{ my: 1 }} value={editUser.username} onChange={e => setEditUser({ ...editUser, username: e.target.value })} />
          <TextField label="Email" fullWidth sx={{ my: 1 }} value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
          <Select fullWidth sx={{ my: 1 }} value={editUser.classId} onChange={e => setEditUser({ ...editUser, classId: e.target.value })}>
            {classes.map(c => <MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>)}
          </Select>
          <Button variant="contained" sx={{ mt: 1, mr: 1 }} onClick={handleEditUser}>Save</Button>
          <Button sx={{ mt: 1 }} onClick={() => setEditUser(null)}>Cancel</Button>
        </Box>
      )}
      {/* Edit question dialog */}
      {editQuestion && (
        <Box sx={{ position: 'fixed', top: 120, left: 0, right: 0, mx: 'auto', width: 400, bgcolor: '#fff', p: 3, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6">Edit Question</Typography>
          <TextField label="Question Text" fullWidth sx={{ my: 1 }} value={editQuestion.text || ''} onChange={e => setEditQuestion({ ...editQuestion, text: e.target.value })} />
          <Button variant="contained" sx={{ mt: 1, mr: 1 }} onClick={handleEditQuestion}>Save</Button>
          <Button sx={{ mt: 1 }} onClick={() => setEditQuestion(null)}>Cancel</Button>
        </Box>
      )}
      <Dialog open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
        <DialogTitle>Reset Exam?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to reset this exam? This will allow it to be started again. This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetConfirm(false)}>Cancel</Button>
          <Button onClick={handleResetExam} color="error" disabled={resetting}>Confirm Reset</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminPanel; 