// Only accessible by invigilators. Proctoring interface for a specific exam.
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // Adjust the import based on your project structure

function ProctoringPage() {
  const [screens, setScreens] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const r = localStorage.getItem('role');
    if (r !== 'invigilator') navigate('/login');
  }, [navigate]);

  useEffect(() => {
    // Check authentication by requesting the test endpoint
    api.get('/auth/test')
      .then(res => {
        if (res.data.user.role !== 'invigilator') navigate('/login');
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  useEffect(() => {
    const socket = io('ws://localhost:4000');
    socket.on('student-screenshot', data => {
      setScreens(prev => {
        const idx = prev.findIndex(s => s.userId === data.userId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = data;
          return copy;
        }
        return [...prev, data];
      });
    });
    socket.on('proctor-alert', alert => setAlerts(a => [alert, ...a]));
    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', padding: 32 }}>
      <div style={{ flex: 3 }}>
        <h2>Student Screens</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {screens.map(s => (
            <div key={s.userId} style={{ border: '1px solid #ccc', padding: 8 }}>
              <div>User: {s.userId}</div>
              <img src={s.screenshot} alt="screen" style={{ width: '100%' }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, marginLeft: 32 }}>
        <h3>Alerts</h3>
        <ul>
          {alerts.map((a, i) => (
            <li key={i}>{a.message} (User: {a.userId})</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProctoringPage;