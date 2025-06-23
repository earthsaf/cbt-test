import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Box, Typography, Button, Card, CardContent, Grid, Snackbar, Alert, LinearProgress, Radio, RadioGroup, FormControlLabel, FormControl, Avatar, Paper } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import io from 'socket.io-client';
import { Bar } from 'react-chartjs-2';

function ExamPage() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [classResults, setClassResults] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const [timer, setTimer] = useState(0); // seconds left
  const [duration, setDuration] = useState(0); // total seconds
  const [subject, setSubject] = useState('');
  const [user, setUser] = useState('');
  const timerRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/exams/${examId}/questions`).then(res => {
      setQuestions(res.data);
      setDuration(res.data.durationMinutes ? res.data.durationMinutes * 60 : 30 * 60);
      setTimer(res.data.durationMinutes ? res.data.durationMinutes * 60 : 30 * 60);
      if (res.data.length > 0 && res.data[0].Subject) setSubject(res.data[0].Subject.name);
    }).catch(() => setQuestions([]));
    // Fetch user info
    setUser(localStorage.getItem('username') || '');
  }, [examId]);

  // Timer logic
  useEffect(() => {
    if (submitted || !duration) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [duration, submitted]);

  // Timer warning
  useEffect(() => {
    if (timer === 5 * 60) setSnack({ open: true, message: '5 minutes left!', severity: 'warning' });
    if (timer === 60) setSnack({ open: true, message: '1 minute left!', severity: 'error' });
  }, [timer]);

  useEffect(() => {
    if (submitted) {
      // Fetch class results for chart (dummy data for now)
      setClassResults({
        labels: ['Alice', 'Bob', 'Carol'],
        scores: [85, 92, 70],
      });
    }
  }, [submitted]);

  useEffect(() => {
    if (!submitted) return;
    // Dummy feedback: mark correct/incorrect
    const fb = questions.map(q => ({
      ...q,
      correct: answers[q.id] === q.answer,
      yourAnswer: answers[q.id],
    }));
    setFeedback(fb);
    setScore(fb.filter(f => f.correct).length);
  }, [submitted, questions, answers]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!submitted) api.post(`/exams/${examId}/autosave`, { answers });
    }, 10000);
    return () => clearInterval(interval);
  }, [answers, examId, submitted]);

  // WebSocket for live question updates
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || '', { transports: ['websocket'] });
    socket.on(`question-update-exam-${examId}`, (data) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.questionId
            ? { ...q, text: data.text, options: data.options, version: data.version }
            : q
        )
      );
      setSnack({ open: true, message: 'A question was updated by the admin.', severity: 'info' });
    });
    return () => socket.disconnect();
  }, [examId]);

  if (!questions.length) return <div>Loading...</div>;

  // Progress bar logic
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const progress = (answered / total) * 100;

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const handleOption = (qid, opt) => setAnswers({ ...answers, [qid]: opt });

  const handleSubmit = async () => {
    try {
      const res = await api.post(`/exams/${examId}/submit`, { answers });
      if (res.data && typeof res.data.score === 'number') {
        setScore(res.data.score);
      }
      setSubmitted(true);
      localStorage.setItem(`exam_${examId}_completed`, 'true');
      localStorage.removeItem('inProgressExamId');
    } catch {
      setSnack({ open: true, message: 'Failed to submit answers', severity: 'error' });
    }
  };

  const handleAbort = () => {
    if (window.confirm('Are you sure you want to abort the test? Your progress will be lost.')) {
      navigate('/dashboard');
    }
  };

  const handleQuickNav = idx => setCurrent(idx);

  if (submitted) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h5">Your Score: {score} / {questions.length}</Typography>
          </CardContent>
        </Card>
        <Typography variant="h6" sx={{ mt: 2 }}>Question Feedback</Typography>
        <Grid container spacing={2}>
          {feedback.map((f, idx) => (
            <Grid item xs={12} key={f.id}>
              <Card sx={{ bgcolor: f.correct ? '#e8f5e9' : '#ffebee' }}>
                <CardContent>
                  <Typography><b>{idx + 1}. {f.text}</b></Typography>
                  <Typography>Your answer: {f.yourAnswer || 'No answer'} {f.correct ? '✅' : '❌'}</Typography>
                  <Typography>Correct answer: {f.answer}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {classResults && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Class Results</Typography>
            <Bar data={{
              labels: classResults.labels,
              datasets: [{
                label: 'Scores',
                data: classResults.scores,
                backgroundColor: '#1976d2',
              }],
            }} />
            <Typography sx={{ mt: 2 }}>Highest: {Math.max(...classResults.scores)}, Lowest: {Math.min(...classResults.scores)}</Typography>
          </Box>
        )}
        <Button sx={{ mt: 3 }} variant="contained" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Box>
    );
  }

  if (review) {
    return (
      <div>
        <h2>Review Answers</h2>
        {questions.map((q, idx) => (
          <div key={q.id} style={{ marginBottom: 16 }}>
            <b>{idx + 1}. {q.text}</b><br />
            {q.options.map((opt, i) => (
              <span key={i} style={{
                background: answers[q.id] === opt ? '#cce' : '#eee',
                marginRight: 8, padding: 4, borderRadius: 4
              }}>{String.fromCharCode(97 + i)}. {opt}</span>
            ))}
            <Button onClick={() => { setCurrent(idx); setReview(false); }}>Edit</Button>
          </div>
        ))}
        <Button onClick={handleSubmit}>Final Submit</Button>
      </div>
    );
  }

  const q = questions[current];
  const options = Array.isArray(q.options)
    ? q.options
    : Object.values(q.options || {});

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button onClick={handleAbort} color="error" variant="contained" startIcon={<ExitToAppIcon />} sx={{ mr: 2 }}>Abort</Button>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>{subject || 'Exam'} &nbsp; <b>{current + 1}/{total}</b></Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>Welcome, {user}</Typography>
          <Paper sx={{ bgcolor: 'red', color: 'white', px: 2, py: 1, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
            <AccessTimeIcon sx={{ mr: 1 }} />
            <Box>
              <Typography sx={{ fontWeight: 'bold', fontSize: 18 }}>Time Left</Typography>
              <Typography sx={{ fontWeight: 'bold', fontSize: 22 }}>{formatTime(timer)}</Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
      {/* Question */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography sx={{ mb: 1, color: 'gray' }}>{q.year || ''}</Typography>
          <Typography sx={{ mb: 2, fontWeight: 'bold' }}>{q.text}</Typography>
          <FormControl component="fieldset">
            <RadioGroup
              value={answers[q.id] || ''}
              onChange={e => handleOption(q.id, e.target.value)}
            >
              {options.map((opt, i) => (
                <FormControlLabel
                  key={i}
                  value={opt}
                  control={<Radio />}
                  label={`(${String.fromCharCode(65 + i)}) ${opt}`}
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button onClick={() => setCurrent(current - 1)} disabled={current === 0} variant="outlined">Previous</Button>
        <Button onClick={handleSubmit} variant="contained" color="success">Submit Test</Button>
        <Button onClick={() => setCurrent(current + 1)} disabled={current === questions.length - 1} variant="outlined">Next</Button>
      </Box>
      {/* Quick Navigation */}
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography sx={{ mb: 1, fontWeight: 'bold', color: 'green' }}>Quick Navigation</Typography>
        <Grid container spacing={1}>
          {questions.map((_, idx) => (
            <Grid item key={idx} xs={1} sm={1} md={0.5} lg={0.5}>
              <Button
                variant={idx === current ? 'contained' : answers[questions[idx].id] ? 'outlined' : 'text'}
                color={idx === current ? 'primary' : answers[questions[idx].id] ? 'success' : 'inherit'}
                onClick={() => handleQuickNav(idx)}
                sx={{ minWidth: 36, minHeight: 36, p: 0 }}
              >
                {idx + 1}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ExamPage;