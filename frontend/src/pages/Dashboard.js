import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Card, CardContent, Button, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Bar } from 'react-chartjs-2';

// Only accessible by students. Student dashboard for exams, results, and profile.

const sections = ['Home', 'Available Tests', 'Missed Tests', 'Completed Tests', 'Results', 'History', 'Profile'];

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get('tab')) || 0;
  const [tab, setTab] = useState(initialTab);
  const [exams, setExams] = useState([]);
  const [role, setRole] = useState('student');
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [inProgressExamId, setInProgressExamId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    
    // Fetch user role from token or API
    const r = localStorage.getItem('role') || 'student';
    setRole(r);
    if (r === 'admin') navigate('/admin');
    if (r === 'teacher') navigate('/teacher');
    if (r === 'invigilator') navigate('/proctor');
    
    // Only fetch data if user is authenticated
    api.get('/exams').then(res => setExams(res.data)).catch(() => setExams([]));
    api.get('/exams/history').then(res => setHistory(res.data)).catch(() => setHistory([]));
    if (tab === 6) {
      setProfileLoading(true);
      api.get('/admin/profile', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
        .then(res => setProfile({ name: res.data.user.name || '', email: res.data.user.email || '' }))
        .catch(() => setProfile({ name: '', email: '' }))
        .finally(() => setProfileLoading(false));
    }
  }, [tab, navigate]);

  // Update tab in URL when it changes
  useEffect(() => {
    setSearchParams({ tab });
  }, [tab, setSearchParams]);

  // Check for in-progress exam in localStorage
  useEffect(() => {
    const storedExam = localStorage.getItem('inProgressExamId');
    if (storedExam) {
      setInProgressExamId(storedExam);
      navigate(`/exam/${storedExam}`);
    }
  }, [navigate]);

  // If user starts an exam, store it
  useEffect(() => {
    if (tab === 1 && exams.length > 0) {
      const incomplete = exams.find(e => localStorage.getItem(`exam_${e.id}_completed`) !== 'true');
      if (incomplete) {
        setInProgressExamId(incomplete.id);
        localStorage.setItem('inProgressExamId', incomplete.id);
        navigate(`/exam/${incomplete.id}`);
      }
    }
  }, [tab, exams, navigate]);

  // Dummy data for missed/completed
  const missed = exams.filter(e => e.status === 'missed');
  const completed = exams.filter(e => e.status === 'completed');
  const available = exams.filter(e => e.status === 'active');

  const handleProfileChange = e => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handleProfileSave = async e => {
    e.preventDefault();
    setProfileMsg('');
    setProfileLoading(true);
    try {
      await api.put('/admin/profile', profile, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      setProfileMsg('Profile updated!');
    } catch {
      setProfileMsg('Failed to update profile');
    }
    setProfileLoading(false);
  };

  const fetchAnalytics = async (examId) => {
    if (!examId) return;
    setLoadingAnalytics(true);
    try {
      const res = await api.get(`/exams/${examId}/analytics`);
      setAnalytics(res.data);
    } catch {
      setAnalytics(null);
    }
    setLoadingAnalytics(false);
  };

  const handleTabChange = (_, newTab) => {
    setTab(newTab);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('inProgressExamId');
    navigate('/');
  };

  // Debug: Show student class and all exams
  const handleDebug = async () => {
    try {
      const res = await api.get('/admin/debug-student-exams');
      setDebugData(res.data);
    } catch {
      setDebugData({ error: 'Failed to fetch debug info' });
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>CBT System</Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Tabs value={tab} onChange={handleTabChange} centered>
        {sections.map((s, i) => <Tab label={s} key={i} />)}
      </Tabs>
      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h5">Welcome!</Typography>
              <Typography>Quick stats and notifications will appear here.</Typography>
            </CardContent>
          </Card>
        )}
        {tab === 1 && (
          <>
            <Button variant="outlined" color="warning" onClick={handleDebug} sx={{ mb: 2 }}>Show Debug Info</Button>
            {debugData && (
              <Card sx={{ mb: 2, p: 2 }}>
                <Typography variant="subtitle1">User: {debugData.user?.username} (ClassId: {debugData.user?.ClassId})</Typography>
                <Typography variant="subtitle1">Exams:</Typography>
                <pre style={{ fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{JSON.stringify(debugData.exams, null, 2)}</pre>
                {debugData.error && <Typography color="error">{debugData.error}</Typography>}
              </Card>
            )}
            <Grid container spacing={2}>
              {available.map(exam => (
                <Grid item xs={12} md={6} lg={4} key={exam.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{exam.title}</Typography>
                      <Typography>Class: {exam.Class ? exam.Class.name : 'Unknown'}</Typography>
                      <Button variant="contained" sx={{ mt: 1 }} onClick={() => navigate(`/exam/${exam.id}`)}>Take Exam</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
        {tab === 2 && (
          <Grid container spacing={2}>
            {missed.map(exam => (
              <Grid item xs={12} md={6} lg={4} key={exam.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{exam.title}</Typography>
                    <Typography color="error">Missed</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {tab === 3 && (
          <Grid container spacing={2}>
            {completed.map(exam => (
              <Grid item xs={12} md={6} lg={4} key={exam.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{exam.title}</Typography>
                    <Typography color="success.main">Completed</Typography>
                    <Button variant="outlined" sx={{ mt: 1 }} onClick={() => navigate(`/exam/${exam.id}`)}>View Score</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {tab === 4 && (
          <Card>
            <CardContent>
              <Typography variant="h6">Results & Analytics</Typography>
              <Box sx={{ mb: 2 }}>
                <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} style={{ minWidth: 200, marginRight: 8 }}>
                  <option value="">Select Completed Exam</option>
                  {completed.map(exam => (
                    <option key={exam.id} value={exam.id}>{exam.title}</option>
                  ))}
                </select>
                <Button variant="contained" onClick={() => fetchAnalytics(selectedExam)} disabled={!selectedExam || loadingAnalytics}>View Analytics</Button>
              </Box>
              {loadingAnalytics && <Typography>Loading...</Typography>}
              {analytics && (
                <Box>
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
            </CardContent>
          </Card>
        )}
        {tab === 5 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Exam History</Typography>
            {history.length === 0 && <Typography>No exam history yet.</Typography>}
            {history.map((h, idx) => (
              <Accordion key={idx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{h.exam?.title || 'Exam'} — Score: {h.score}/{h.total}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {h.answers.map((a, i) => (
                    <Box key={i} sx={{ mb: 1 }}>
                      <Typography><b>Q:</b> {a.question}</Typography>
                      <Typography><b>Your answer:</b> {a.yourAnswer || 'No answer'} {a.correct ? '✅' : '❌'}</Typography>
                      <Typography><b>Correct answer:</b> {a.correctAnswer}</Typography>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
        {tab === 6 && (
          <Card sx={{ maxWidth: 400, margin: 'auto' }}>
            <CardContent>
              <Typography variant="h6">Profile</Typography>
              <form onSubmit={handleProfileSave}>
                <input name="name" placeholder="Name" value={profile.name} onChange={handleProfileChange} style={{ width: '100%', marginBottom: 12 }} />
                <input name="email" placeholder="Email" value={profile.email} onChange={handleProfileChange} style={{ width: '100%', marginBottom: 12 }} />
                <input name="password" type="password" placeholder="New Password" onChange={handleProfileChange} style={{ width: '100%', marginBottom: 12 }} />
                <Button type="submit" variant="contained" disabled={profileLoading}>Save</Button>
                {profileMsg && <Typography sx={{ mt: 1 }} color={profileMsg.includes('updated') ? 'success.main' : 'error'}>{profileMsg}</Typography>}
              </form>
            </CardContent>
          </Card>
        )}
        {tab === 7 && (
          <Card>
            <CardContent>
              <Typography variant="h6">Debug Info</Typography>
              <Button variant="contained" onClick={handleDebug}>Fetch Debug Data</Button>
              {debugData && (
                <Box sx={{ mt: 2 }}>
                  <pre>{JSON.stringify(debugData, null, 2)}</pre>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}

export default Dashboard;