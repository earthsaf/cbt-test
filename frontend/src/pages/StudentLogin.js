import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api'; // Add this import

function StudentLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const res = await axios.post(`${apiUrl}/auth/login`, { username, password, role: 'student' });
      if (res.data && res.data.success) {
        // Cookie is set by backend; no need to check for token in response
        // Redirect to pending exam if set
        const pendingExamId = localStorage.getItem('pendingExamId');
        if (pendingExamId) {
          localStorage.removeItem('pendingExamId');
          navigate(`/exam/${pendingExamId}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Login failed.');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  // Debug login function
  const handleDebugLogin = async () => {
    setError('');
    try {
      const res = await api.post('/auth/debug-login', { username, password, role: 'student' });
      alert('Debug login result: ' + JSON.stringify(res.data));
    } catch (err) {
      if (err.response) {
        alert('Debug login error: ' + JSON.stringify(err.response.data));
      } else {
        alert('Debug login error: ' + err.message);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1976d2 0%, #43cea2 100%)',
      fontFamily: 'Poppins, Roboto, Arial, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(25, 118, 210, 0.12)',
        padding: '40px 32px',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          background: 'linear-gradient(90deg, #1976d2, #43cea2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Welcome Back, Student!
        </h1>
        <div style={{ color: '#444', fontSize: 16, marginBottom: 32 }}>
          Enter your username and password to continue to your CBT Dashboard.
        </div>
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <label style={{ fontWeight: 600, color: '#222', marginBottom: 4, display: 'block' }}>Username</label>
          <input
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #cfd8dc',
              outline: 'none',
              marginBottom: 18,
              fontSize: 16,
              transition: 'box-shadow 0.2s',
              boxShadow: '0 0 0 0 #1976d2',
            }}
            onFocus={e => e.target.style.boxShadow = '0 0 0 2px #1976d2'}
            onBlur={e => e.target.style.boxShadow = '0 0 0 0 #1976d2'}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <label style={{ fontWeight: 600, color: '#222', marginBottom: 4, display: 'block' }}>Password</label>
          <input
            type="password"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #cfd8dc',
              outline: 'none',
              marginBottom: 18,
              fontSize: 16,
              transition: 'box-shadow 0.2s',
              boxShadow: '0 0 0 0 #1976d2',
            }}
            onFocus={e => e.target.style.boxShadow = '0 0 0 2px #1976d2'}
            onBlur={e => e.target.style.boxShadow = '0 0 0 0 #1976d2'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px 0',
              background: 'linear-gradient(90deg, #1976d2, #43cea2)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              marginTop: 8,
              marginBottom: 8,
              fontFamily: 'inherit',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.target.style.background = 'linear-gradient(90deg, #125ea2, #2fa07a)'}
            onMouseOut={e => e.target.style.background = 'linear-gradient(90deg, #1976d2, #43cea2)'}
          >
            Login to Begin
          </button>
          {/* Debug Login Button */}
          <button
            type="button"
            onClick={handleDebugLogin}
            style={{
              width: '100%',
              padding: '10px 0',
              background: '#f90',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              marginTop: 4,
              marginBottom: 8,
              fontFamily: 'inherit',
              transition: 'background 0.2s',
            }}
          >
            Debug Login
          </button>
          {error && <div style={{ color: 'crimson', marginTop: 8, fontWeight: 500 }}>{error}</div>}
        </form>
        <div style={{ color: '#666', fontSize: 14, marginTop: 16 }}>
          Having trouble logging in? Contact your teacher.
        </div>
        <div style={{ marginTop: 18 }}>
          <span style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/staff-login')}>
            Staff? Sign in here
          </span>
        </div>
      </div>
    </div>
  );
}

export default StudentLogin;
