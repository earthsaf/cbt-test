// Only accessible by invigilators. Proctoring interface for a specific exam.
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaUser, FaBell, FaHandPaper, FaSearch, FaPause, FaPlay, FaFlag, FaCamera } from 'react-icons/fa';

function ProctoringPage() {
  const [screens, setScreens] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
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
    
    // Socket listeners
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

    socket.on('proctor-alert', alert => {
      setAlerts(a => [alert, ...a]);
      toast.warning(`New alert: ${alert.message}`);
    });

    socket.on('student-status', status => {
      const student = students.find(s => s.userId === status.userId);
      if (student) {
        setStudents(prev => prev.map(s => 
          s.userId === status.userId ? { ...s, ...status } : s
        ));
      }
    });

    return () => socket.disconnect();
  }, []);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.rollNumber.toString().includes(searchTerm)
  );

  const handleForceSubmit = (userId) => {
    // Implement force submit logic here
  };

  const handlePauseExam = (userId, action) => {
    // Implement pause exam logic here
  };

  const handleLockStudent = (userId) => {
    // Implement lock student logic here
  };

  const handleBroadcast = () => {
    // Implement broadcast message logic here
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <h2>Invigilator Dashboard</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button
            onClick={() => setIsBroadcasting(true)}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Broadcast Message
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Student Grid */}
        <div style={{ flex: 3, overflow: 'auto', padding: '1rem' }}>
          <h3>Student Screens</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {filteredStudents.map(student => (
              <div key={student.userId} style={{ 
                border: '1px solid #ccc', 
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: student.status === 'flagged' ? '#ffebee' : 
                                student.status === 'idle' ? '#fff3e0' : '#ffffff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <strong>{student.name}</strong>
                    <br />
                    Roll: {student.rollNumber}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleForceSubmit(student.userId)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      Force Submit
                    </button>
                    <button
                      onClick={() => handlePauseExam(student.userId, student.status === 'paused' ? 'resume' : 'pause')}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: student.status === 'paused' ? '#4CAF50' : '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      {student.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      onClick={() => handleLockStudent(student.userId)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      Lock
                    </button>
                  </div>
                </div>
                <img 
                  src={screens.find(s => s.userId === student.userId)?.screenshot || '/default-screen.png'} 
                  alt="screen" 
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
                />
                {student.flags?.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <FaFlag style={{ color: '#f44336', marginRight: '0.5rem' }} />
                    <span style={{ color: '#f44336' }}>{student.flags.length} Flags</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts and Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
            <h3>Alerts</h3>
            <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
              {alerts.map((alert, index) => (
                <div key={index} style={{ 
                  padding: '0.5rem',
                  borderBottom: '1px solid #ddd',
                  backgroundColor: alert.severity === 'high' ? '#ffebee' : 
                                  alert.severity === 'medium' ? '#fff3e0' : '#ffffff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ 
                        color: alert.severity === 'high' ? '#f44336' : 
                              alert.severity === 'medium' ? '#ff9800' : '#4CAF50'
                      }}>{alert.message}</span>
                      <br />
                      <small>{new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                    <div>
                      <FaUser /> {alert.userId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Broadcast Message Modal */}
          {isBroadcasting && (
            <div style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h3>Broadcast Message</h3>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your message here..."
                  style={{ width: '100%', height: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    onClick={() => setIsBroadcasting(false)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBroadcast}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProctoringPage;