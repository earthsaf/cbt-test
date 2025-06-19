import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Card, CardContent, Button, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Bar } from 'react-chartjs-2';

// Only accessible by students. Student dashboard for exams, results, and profile.

const sections = ['Home', 'Available Tests', 'Missed Tests', 'Completed Tests', 'Results', 'History', 'Profile'];

function Dashboard() {
  const [tab, setTab] = useState(0);
  const [exams, setExams] = useState([]);
  const [role, setRole] = useState('student');
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user role from token or API
    const r = localStorage.getItem('role') || 'student';
    setRole(r);
    if (r === 'admin') navigate('/admin');
    if (r === 'teacher') navigate('/teacher');
    if (r === 'invigilator') navigate('/proctor');
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

  // Set tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('studentDashboardTab');
    if (savedTab !== null) setTab(Number(savedTab));
  }, []);

  // Dummy data for missed/completed
  const missed = exams.filter(e => e.status === 'missed');
  const completed = exams.filter(e => e.status === 'completed');
  const available = exams.filter(e => e.status === 'available');

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

  // Update localStorage when tab changes
  const handleTabChange = (_, newTab) => {
    setTab(newTab);
    localStorage.setItem('studentDashboardTab', newTab);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>CBT System</Typography>
          {/* No panel buttons for students */}
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
          <Grid container spacing={2}>
            {available.map(exam => (
              <Grid item xs={12} md={6} lg={4} key={exam.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{exam.title}</Typography>
                    <Typography>Class: {exam.className}</Typography>
                    <Button variant="contained" sx={{ mt: 1 }} onClick={() => navigate(`/exam/${exam.id}`)}>Take Exam</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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
      </Box>
    </Box>
  );
}

export default Dashboard; 