import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Card, CardContent, Button, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const sections = ['Home', 'Available Tests', 'Missed Tests', 'Completed Tests', 'Results', 'History'];

function Dashboard() {
  const [tab, setTab] = useState(0);
  const [exams, setExams] = useState([]);
  const [role, setRole] = useState('student');
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user role from token or API
    setRole(localStorage.getItem('role') || 'student');
    api.get('/exams').then(res => setExams(res.data)).catch(() => setExams([]));
    api.get('/exams/history').then(res => setHistory(res.data)).catch(() => setHistory([]));
  }, []);

  // Dummy data for missed/completed
  const missed = exams.filter(e => e.status === 'missed');
  const completed = exams.filter(e => e.status === 'completed');
  const available = exams.filter(e => e.status === 'available');

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>CBT System</Typography>
          {role === 'admin' && <Button color="inherit" onClick={() => navigate('/admin')}>Admin Panel</Button>}
          {role === 'teacher' && <Button color="inherit" onClick={() => navigate('/admin')}>Teacher Panel</Button>}
          {role === 'invigilator' && <Button color="inherit" onClick={() => navigate('/proctor')}>Invigilator Panel</Button>}
        </Toolbar>
      </AppBar>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
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
              {/* Placeholder for chart/graph */}
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Chart will appear here when data is available.</Typography>
              </Box>
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
      </Box>
    </Box>
  );
}

export default Dashboard; 