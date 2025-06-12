import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Box, Typography, Button, Card, CardContent, Grid, Snackbar, Alert, LinearProgress } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import io from 'socket.io-client';

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
  const timerRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/exams/${examId}/questions`).then(res => {
      setQuestions(res.data);
      // For demo, set 30 min timer; in real app, fetch from exam info
      setDuration(30 * 60); // 30 minutes
      setTimer(30 * 60);
    }).catch(() => setQuestions([]));
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
    // eslint-disable-next-line
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
    const socket = io(process.env.REACT_APP_API_URL.replace('/api', ''), { transports: ['websocket'] });
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
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const handleOption = (qid, opt) => setAnswers({ ...answers, [qid]: opt });

  const handleSubmit = async () => {
    await api.post(`/exams/${examId}/submit`, { answers });
    setSubmitted(true);
  };

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
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Time Left: <span style={{ color: timer <= 60 ? 'red' : timer <= 5 * 60 ? 'orange' : 'inherit' }}>{formatTime(timer)}</span></Typography>
        <Typography variant="body2">Progress: {answered}/{total}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 10, borderRadius: 5 }} />
      <Card sx={{ my: 2 }}>
        <CardContent>
          <Typography><b>{current + 1}. {q.text}</b></Typography>
          {q.options.map((opt, i) => (
            <Button
              key={i}
              onClick={() => handleOption(q.id, opt)}
              sx={{
                display: 'block',
                my: 1,
                background: answers[q.id] === opt ? '#cce' : '#fff',
                border: '1px solid #ccc',
                borderRadius: 2,
                width: '100%',
              }}
            >
              {String.fromCharCode(97 + i)}. {opt}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Box sx={{ mt: 2 }}>
        <Button onClick={() => setCurrent(current - 1)} disabled={current === 0}>Previous</Button>
        <Button onClick={() => setCurrent(current + 1)} disabled={current === questions.length - 1} sx={{ mx: 2 }}>Next</Button>
        <Button onClick={() => setReview(true)}>Review</Button>
        <Button variant="contained" color="error" sx={{ ml: 2 }} onClick={handleSubmit}>Submit Now</Button>
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