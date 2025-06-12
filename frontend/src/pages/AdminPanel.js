import React, { useState, useEffect } from 'react';
import { AppBar, Tabs, Tab, Box, Typography, Card, CardContent, Button, Grid, TextField, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';

const tabs = ['Users', 'Classes', 'Exams', 'Analytics'];

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

  useEffect(() => {
    api.get('/admin/users').then(res => setUsers(res.data)).catch(() => setUsers([]));
    api.get('/admin/classes').then(res => setClasses(res.data)).catch(() => setClasses([]));
    api.get('/admin/exams').then(res => setExams(res.data)).catch(() => setExams([]));
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

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <AppBar position="static" color="default">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {tabs.map((t, i) => <Tab label={t} key={i} />)}
        </Tabs>
      </AppBar>
      <Box sx={{ mt: 3 }}>
        {tab === 0 && (
          <Grid container spacing={2}>
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
          </Grid>
        )}
        {tab === 1 && (
          <Box>
            <Typography variant="h6">Classes</Typography>
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