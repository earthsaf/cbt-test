// Only accessible by admin. Management controls for users, exams, invigilator codes, analytics.
import React, { useState, useEffect } from 'react';
import { AppBar, Tabs, Tab, Box, Typography, Card, CardContent, Button, Grid, TextField, Select, MenuItem, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, DialogContentText } from '@mui/material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

const tabs = ['Users', 'Classes', 'Exams', 'Subjects', 'Assignments', 'Settings'];

function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get('tab')) || parseInt(localStorage.getItem('adminActiveTab')) || 0;
  const [tab, setTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [analytics, setAnalytics] = useState({ results: [], highest: 0, lowest: 0, avg: 0 });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student', name: '', email: '', classId: '', telegramId: '' });
  const [passwordError, setPasswordError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [invigilatorCodes, setInvigilatorCodes] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ teacherId: '', classId: '', subjectId: '' });
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
  const [loggedInUsers, setLoggedInUsers] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/staff-login');
  };

  useEffect(() => {
    // Check authentication by requesting the test endpoint
    console.log('AdminPanel: Checking authentication...');
    api.get('/auth/test')
      .then(res => {
        console.log('Auth test response:', res.data);
        if (res.data?.user?.role !== 'admin') {
          console.log('User is not an admin, redirecting to login');
          navigate('/staff-login');
          setSnack({ open: true, message: 'You must be signed in as admin.', severity: 'error' });
        } else {
          console.log('User is authenticated as admin');
        }
      })
      .catch((error) => {
        console.error('Auth test error:', error);
        console.error('Error response:', error.response);
        navigate('/staff-login');
        setSnack({ open: true, message: 'You must be signed in as admin.', severity: 'error' });
      });
  }, [navigate]);

  useEffect(() => {
    setSearchParams({ tab: tab.toString() });
    localStorage.setItem('adminActiveTab', tab.toString());
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

  useEffect(() => {
    const fetchLogins = async () => {
      try {
        const res = await api.get('/admin/logins');
        setLoggedInUsers(Array.isArray(res?.data) ? res.data : []);
      } catch (error) {
        console.error('Error fetching logged in users:', error);
        setLoggedInUsers([]);
      }
    };
    
    fetchLogins();
    const interval = setInterval(fetchLogins, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      setSnack({ open: true, message: 'User deleted successfully', severity: 'success' });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user';
      setSnack({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

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

  const fetchAnalytics = async (examId) => {
    try {
      const res = await api.get(`/admin/exams/${examId}/results`);
      setAnalytics(res.data);
    } catch {
      setAnalytics({ results: [], highest: 0, lowest: 0, avg: 0 });
    }
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!validatePassword(newUser.password)) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    
    setPasswordError('');
    setCreatingUser(true);
    
    try {
      await api.post('/admin/users', newUser);
      setSnack({ open: true, message: 'User created successfully', severity: 'success' });
      setNewUser({ username: '', password: '', role: 'student', name: '', email: '', classId: '', telegramId: '' });
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      setSnack({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setCreatingUser(false);
    }
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
      const res = await api.get('/admin/exams');
      setExams(res.data);
      setSelectedExam(res.data.find(e => e.id === selectedExam.id) || null);
    } catch {
      setSnack({ open: true, message: 'Failed to reset exam', severity: 'error' });
    }
    setResetting(false);
  };

  const handleAutoEndExams = async () => {
    try {
      await api.post('/admin/exams/auto-end');
      setSnack({ open: true, message: 'Checked and ended any expired exams.', severity: 'success' });
      api.get('/admin/exams').then(res => setExams(res.data)).catch(() => {});
    } catch {
      setSnack({ open: true, message: 'Failed to auto-end exams.', severity: 'error' });
    }
  };

  return (
    <div>
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete user: <strong>{userToDelete?.username}</strong>?</Typography>
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteUser(userToDelete?.id)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <AppBar position="static">
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} aria-label="admin tabs">
              {tabs.map(t => <Tab label={t} key={t} />)}
            </Tabs>
          </Grid>
          <Grid item>
            <Button color="inherit" onClick={handleLogout} sx={{ mr: 2 }}>Logout</Button>
          </Grid>
        </Grid>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Box>
            <Typography variant="h6">Users</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField label="Search Users" value={userSearch} onChange={e => setUserSearch(e.target.value)} variant="outlined" size="small" />
              <Select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} size="small">
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </Box>
            <Grid container spacing={2}>
              {users
                .filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()))
                .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter)
                .map(user => (
                  <Grid item xs={12} sm={6} md={4} key={user.id}>
                    <Card>
                      <CardContent>
                        <Typography><strong>{user.username}</strong> ({user.role})</Typography>
                        <Typography>{user.name}</Typography>
                        <Typography>{user.email}</Typography>
                        <Typography>Class: {classes.find(c => c.id === user.ClassId)?.name || 'N/A'}</Typography>
                        <Button size="small" onClick={() => setEditUser(user)}>Edit</Button>
                        <Button size="small" color="error" onClick={() => confirmDelete(user)}>Delete</Button>
                      </CardContent>
                    </Card>
                  </Grid>
              ))}
            </Grid>
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6">Create User</Typography>
                <form onSubmit={handleCreateUser}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required error={!!passwordError} helperText={passwordError} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Email" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></Grid>
                    <Grid item xs={12} sm={6}>
                      <Select fullWidth value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                        <MenuItem value="student">Student</MenuItem>
                        <MenuItem value="teacher">Teacher</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </Select>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Select fullWidth value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} displayEmpty>
                        <MenuItem value=""><em>No Class</em></MenuItem>
                        {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </Select>
                    </Grid>
                    <Grid item xs={12}><TextField fullWidth label="Telegram ID" value={newUser.telegramId} onChange={e => setNewUser({ ...newUser, telegramId: e.target.value })} /></Grid>
                    <Grid item xs={12}><Button type="submit" variant="contained" disabled={creatingUser}>{creatingUser ? 'Creating...' : 'Create User'}</Button></Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography variant="h6">Classes</Typography>
            <form onSubmit={handleAddClass} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <TextField label="New Class Name" value={newClass} onChange={e => setNewClass(e.target.value)} variant="outlined" size="small" sx={{ flex: 1 }} />
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
              <TextField label="Search Exams" value={examSearch} onChange={e => setExamSearch(e.target.value)} variant="outlined" size="small" />
              <Select value={examClass} onChange={e => setExamClass(e.target.value)} displayEmpty size="small">
                <MenuItem value="">All Classes</MenuItem>
                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
              <Select value={examSubject} onChange={e => setExamSubject(e.target.value)} displayEmpty size="small">
                <MenuItem value="">All Subjects</MenuItem>
                {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </Box>
            <Grid container spacing={2}>
              {exams.map(exam => (
                <Grid item xs={12} sm={6} md={4} key={exam.id}>
                  <Card>
                    <CardContent>
                      <Typography><strong>{exam.title}</strong></Typography>
                      <Typography>Class: {classes.find(c => c.id === exam.ClassId)?.name || 'N/A'}</Typography>
                      <Typography>Subject: {subjects.find(s => s.id === exam.SubjectId)?.name || 'N/A'}</Typography>
                      <Typography>Status: {exam.status}</Typography>
                      <Typography>Start Time: {exam.startTime ? dayjs(exam.startTime).format('DD/MM/YY HH:mm') : 'Not started'}</Typography>
                      <Button size="small" onClick={() => openExamModal(exam)}>Details/Start</Button>
                      <Button size="small" onClick={() => fetchAnalytics(exam.id)}>Analytics</Button>
                      <Button size="small" onClick={() => handleGetInvigilatorCode(exam.id)}>Get Code</Button>
                      <Button size="small" onClick={() => handleGenerateInvigilatorCode(exam.id)}>New Code</Button>
                      {invigilatorCodes[exam.id] && <Typography>Code: {invigilatorCodes[exam.id]}</Typography>}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {selectedExam && (
          <Dialog open={!!selectedExam} onClose={() => setSelectedExam(null)} fullWidth maxWidth="md">
            <DialogTitle>
              Exam Details: {selectedExam.title}
              <Typography variant="caption" display="block">
                Class: {classes.find(c => c.id === selectedExam.ClassId)?.name || 'N/A'} |
                Subject: {subjects.find(s => s.id === selectedExam.SubjectId)?.name || 'N/A'}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel control={<Switch checked={examSettings.scramble} onChange={e => setExamSettings({ ...examSettings, scramble: e.target.checked })} />} label="Scramble Questions" />
                <TextField type="number" label="Duration (minutes)" value={examSettings.durationMinutes} onChange={e => setExamSettings({ ...examSettings, durationMinutes: e.target.value })} sx={{ ml: 2 }} />
              </Box>
              <Box>
                <Typography variant="h6">Questions</Typography>
                {examQuestions.map((q, idx) => (
                  <Box key={q.id} sx={{ mb: 1, p: 1, border: '1px solid #eee' }}>
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
        )}

        {tab === 3 && (
          <Box>
            <Typography variant="h6">Subjects</Typography>
            <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <TextField label="New Subject Name" value={newSubject} onChange={e => setNewSubject(e.target.value)} variant="outlined" size="small" sx={{ flex: 1 }} />
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
            <Typography variant="h5" sx={{ mb: 2 }}>Settings & Maintenance</Typography>
            <Card sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6">Logged In Users</Typography>
              <Typography variant="body2" sx={{ color: 'gray', mb: 1 }}>
                {!Array.isArray(loggedInUsers) || loggedInUsers.length === 0 
                  ? 'No users currently logged in.' 
                  : loggedInUsers.map(u => `${u?.username || 'Unknown'} (${u?.role || 'unknown'})`).join(', ')}
              </Typography>
            </Card>
            <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Exam Management</Typography>
                    <Button variant="contained" color="primary" onClick={handleAutoEndExams} sx={{ mr: 1 }}>
                        Auto-end Expired Exams
                    </Button>
                </Grid>
            </Grid>
          </Box>
        )}

        {editUser && (
          <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
            <DialogTitle>Edit User</DialogTitle>
            <DialogContent>
              <TextField label="Name" fullWidth sx={{ my: 1 }} value={editUser.username} onChange={e => setEditUser({ ...editUser, username: e.target.value })} />
              <TextField label="Email" fullWidth sx={{ my: 1 }} value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
              <Select fullWidth sx={{ my: 1 }} value={editUser.classId} onChange={e => setEditUser({ ...editUser, classId: e.target.value })} displayEmpty>
                <MenuItem value=""><em>No Class</em></MenuItem>
                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleEditUser}>Save</Button>
            </DialogActions>
          </Dialog>
        )}

        {showResetConfirm && (
          <Dialog open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
            <DialogTitle>Confirm Exam Reset</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to reset this exam? This will clear its start time and allow it to be started again. Student progress will not be deleted, but they may be able to retake it if they log back in.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowResetConfirm(false)}>Cancel</Button>
              <Button onClick={handleResetExam} color="error" disabled={resetting}>
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </DialogActions>
          </Dialog>
        )}

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
    </div>
  );
}

export default AdminPanel;
