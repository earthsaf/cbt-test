import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Grid, Paper, AppBar, Toolbar, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField as MuiTextField, CircularProgress, Badge } from '@mui/material';
import { Search, Campaign, Flag, Person, DoNotDisturbOn, PlayArrow, StopCircle } from '@mui/icons-material';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:4000';

function ProctoringPage() {
  const [socket, setSocket] = useState(null);
  const [students, setStudents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Verify invigilator role on mount
  useEffect(() => {
    api.get('/auth/test').then(res => {
      if (res.data.user?.role !== 'invigilator') {
        toast.error('Access denied. Only for invigilators.');
        navigate('/login');
      }
      // TODO: Fetch initial student list for the assigned exam
      setLoading(false);
    }).catch(() => {
      toast.error('Authentication failed. Please log in.');
      navigate('/login');
    });
  }, [navigate]);

  // Setup and teardown socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { transports: ['websocket'], upgrade: false });
    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      toast.error(`Socket connection failed: ${err.message}`);
    });

    return () => newSocket.disconnect();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('student-screenshot', (data) => {
      setStudents(prev => prev.map(s => s.id === data.userId ? { ...s, screenshot: data.screenshot } : s));
    });

    socket.on('proctor-alert', (alert) => {
      setAlerts(prev => [alert, ...prev]);
      toast.warning(`Alert for ${alert.studentName}: ${alert.message}`, { icon: <Flag /> });
    });

    socket.on('student-status-update', (status) => {
      setStudents(prev => prev.map(s => s.id === status.userId ? { ...s, ...status } : s));
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off('student-screenshot');
      socket.off('proctor-alert');
      socket.off('student-status-update');
    };
  }, [socket]);

  const sendProctoringAction = useCallback((action, payload) => {
    if (socket) {
      socket.emit('proctor-action', { action, ...payload });
      toast.info(`Action sent: ${action}`);
    } else {
      toast.error('Cannot send action: socket not connected.');
    }
  }, [socket]);

  const handleForceSubmit = (userId) => sendProctoringAction('force-submit', { userId });
  const handlePauseExam = (userId) => sendProctoringAction('pause-exam', { userId });
  const handleResumeExam = (userId) => sendProctoringAction('resume-exam', { userId });
  const handleLockStudent = (userId) => sendProctoringAction('lock-student', { userId });
  const handleBroadcast = () => {
    sendProctoringAction('broadcast', { message: broadcastMessage });
    setBroadcastMessage('');
    setBroadcastModalOpen(false);
  };

  const filteredStudents = useMemo(() =>
    students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toString().includes(searchTerm)
    ), [students, searchTerm]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Invigilator Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search Students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
            <Button variant="contained" startIcon={<Campaign />} onClick={() => setBroadcastModalOpen(true)}>
              Broadcast
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Grid container spacing={2} sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
          {filteredStudents.length > 0 ? filteredStudents.map(student => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={student.id}>
              <Paper elevation={3} sx={{ p: 2, position: 'relative', bgcolor: student.status === 'flagged' ? 'warning.light' : 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">{student.name}</Typography>
                  <Typography variant="body2">Roll: {student.rollNumber}</Typography>
                </Box>
                <img
                  src={student.screenshot || '/default-screen.png'}
                  alt={`${student.name}'s screen`}
                  style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 4, background: '#e0e0e0' }}
                />
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-around' }}>
                  <Button size="small" color="error" startIcon={<StopCircle />} onClick={() => handleForceSubmit(student.id)}>Submit</Button>
                  {student.status === 'paused' ?
                    <Button size="small" color="success" startIcon={<PlayArrow />} onClick={() => handleResumeExam(student.id)}>Resume</Button> :
                    <Button size="small" color="warning" startIcon={<DoNotDisturbOn />} onClick={() => handlePauseExam(student.id)}>Pause</Button>
                  }
                </Box>
              </Paper>
            </Grid>
          )) : (
            <Typography sx={{ p: 4, width: '100%', textAlign: 'center' }}>No students found or connected.</Typography>
          )}
        </Grid>

        <Paper sx={{ width: 350, borderLeft: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>Alerts</Typography>
          <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {alerts.length > 0 ? alerts.map((alert, index) => (
              <ListItem key={index} divider>
                <ListItemAvatar>
                  <Badge badgeContent={alert.severity === 'high' ? '!' : null} color="error">
                    <Avatar sx={{ bgcolor: alert.severity === 'high' ? 'error.main' : 'warning.main' }}><Flag /></Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={`${alert.studentName}: ${alert.message}`}
                  secondary={new Date(alert.timestamp).toLocaleString()}
                />
              </ListItem>
            )) : (
              <ListItem><ListItemText primary="No alerts yet." /></ListItem>
            )}
          </List>
        </Paper>
      </Box>

      <Dialog open={broadcastModalOpen} onClose={() => setBroadcastModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Broadcast a Message to All Students</DialogTitle>
        <DialogContent>
          <MuiTextField
            autoFocus
            margin="dense"
            label="Message"
            type="text"
            fullWidth
            variant="standard"
            multiline
            rows={4}
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBroadcastModalOpen(false)}>Cancel</Button>
          <Button onClick={handleBroadcast} variant="contained">Send Broadcast</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProctoringPage;