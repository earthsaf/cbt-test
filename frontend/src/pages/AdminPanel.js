// Only accessible by admin. Management controls for users, exams, invigilator codes, analytics.
import React, { useState, useEffect } from 'react';
import { AppBar, Tabs, Tab, Box, Typography, Card, CardContent, Button, Grid, TextField, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const tabs = ['Users', 'Classes', 'Exams', 'Subjects', 'Assignments', 'Analytics'];

function AdminPanel() {
  const [tab, setTab] = useState(0);
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
  const navigate = useNavigate();

  useEffect(() => {
    const r = localStorage.getItem('role');
    if (r !== 'admin') navigate('/login');
  }, [navigate]);

  useEffect(() => {
    api.get('/admin/users').then(res => setUsers(res.data)).catch(() => setUsers([]));
    api.get('/admin/classes').then(res => setClasses(res.data)).catch(() => setClasses([]));
    api.get('/admin/exams').then(res => setExams(res.data)).catch(() => setExams([]));
    api.get('/admin/subjects').then(res => setSubjects(res.data)).catch(() => setSubjects([]));
    api.get('/admin/teacher-assignments').then(res => setAssignments(res.data)).catch(() => setAssignments([]));
  }, []);

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
            <Grid container spacing={2}>
              {exams.map(exam => (
                <Grid item xs={12} md={6} key={exam.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{exam.title}</Typography>
                      <Typography>Class: {exam.Class ? exam.Class.name : ''}</Typography>
                      <Typography>Status: {exam.status}</Typography>
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Button size="small" onClick={() => handleGetInvigilatorCode(exam.id)} variant="outlined">View Invigilator Code</Button>
                        <Button size="small" sx={{ ml: 1 }} onClick={() => handleGenerateInvigilatorCode(exam.id)} variant="contained">Generate New Code</Button>
                        {invigilatorCodes[exam.id] && <Typography sx={{ mt: 1 }}>Code: <b>{invigilatorCodes[exam.id]}</b></Typography>}
                      </Box>
                      <Button sx={{ mt: 1 }} onClick={() => setEditQuestion({ ...exam, id: 1 })}>Edit Question</Button>
                      <Button sx={{ mt: 1, ml: 1 }} onClick={() => setRetakeExam({ ...retakeExam, examId: exam.id })}>Retake</Button>
                      <Button sx={{ mt: 1, ml: 1 }} onClick={() => fetchAnalytics(exam.id)}>View Analytics</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {/* Retake controls */}
            {retakeExam.examId && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1">Retake Exam</Typography>
                <Select value={retakeExam.classId} onChange={e => setRetakeExam({ ...retakeExam, classId: e.target.value })} displayEmpty sx={{ mr: 2 }}>
                  <MenuItem value="">Select Class</MenuItem>
                  {classes.map(c => <MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>)}
                </Select>
                <TextField label="User ID (optional)" value={retakeExam.userId} onChange={e => setRetakeExam({ ...retakeExam, userId: e.target.value })} sx={{ mr: 2 }} />
                <Button variant="contained" onClick={handleRetake}>Confirm Retake</Button>
              </Box>
            )}
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
            <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input type="file" onChange={handleFileChange} />
              {fileError && <Typography color="error">{fileError}</Typography>}
            </form>
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
        {tab === 5 && (
          <Box>
            <Typography variant="h6">Analytics</Typography>
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
            </Box>
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
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminPanel; 