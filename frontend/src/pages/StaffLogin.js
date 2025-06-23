import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const roles = [
  { value: 'teacher', label: 'Teacher', color: '#1976d2' },
  { value: 'invigilator', label: 'Invigilator', color: '#43cea2' },
  { value: 'admin', label: 'Admin', color: '#23243a' },
];

function StaffLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const res = await axios.post(`${apiUrl}/auth/login`, { username, password, role });
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', role);
        if (role === 'admin') navigate('/admin');
        else if (role === 'teacher') navigate('/teacher');
        else if (role === 'invigilator') navigate('/proctor');
      } else {
        setError('Login failed: No token received.');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #23243a 0%, #1976d2 100%)',
      fontFamily: 'Inter, Helvetica, Arial, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(44, 62, 80, 0.18)',
        padding: '40px 32px',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 8,
          color: '#23243a',
          letterSpacing: 1,
        }}>
          Staff Login
        </h1>
        <div style={{ color: '#444', fontSize: 16, marginBottom: 32 }}>
          Enter your credentials to access your staff dashboard.
        </div>
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {roles.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: role === r.value ? `2px solid ${r.color}` : '1px solid #b0b3c6',
                  background: role === r.value ? r.color : '#f7f7fa',
                  color: role === r.value ? '#fff' : '#23243a',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <label style={{ fontWeight: 700, color: '#23243a', marginBottom: 4, display: 'block' }}>{role.charAt(0).toUpperCase() + role.slice(1)} Username</label>
          <input
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #b0b3c6',
              outline: 'none',
              marginBottom: 18,
              fontSize: 16,
              background: '#f7f7fa',
              transition: 'box-shadow 0.2s',
              boxShadow: '0 0 0 0 #23243a',
            }}
            onFocus={e => e.target.style.boxShadow = '0 0 0 2px #23243a'}
            onBlur={e => e.target.style.boxShadow = '0 0 0 0 #23243a'}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <label style={{ fontWeight: 700, color: '#23243a', marginBottom: 4, display: 'block' }}>Password</label>
          <input
            type="password"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #b0b3c6',
              outline: 'none',
              marginBottom: 18,
              fontSize: 16,
              background: '#f7f7fa',
              transition: 'box-shadow 0.2s',
              boxShadow: '0 0 0 0 #23243a',
            }}
            onFocus={e => e.target.style.boxShadow = '0 0 0 2px #23243a'}
            onBlur={e => e.target.style.boxShadow = '0 0 0 0 #23243a'}
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
              background: '#23243a',
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              marginTop: 8,
              marginBottom: 8,
              fontFamily: 'inherit',
              letterSpacing: 1,
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.target.style.background = '#2d3559'}
            onMouseOut={e => e.target.style.background = '#23243a'}
          >
            Login as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
          {error && <div style={{ color: 'crimson', marginTop: 8, fontWeight: 500 }}>{error}</div>}
        </form>
        <div style={{ color: '#666', fontSize: 14, marginTop: 16 }}>
          Only authorized personnel are granted access. Contact the system administrator if you have trouble logging in.
        </div>
        <div style={{ marginTop: 18 }}>
          <span style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/student-login')}>
            Student? Sign in here
          </span>
        </div>
      </div>
    </div>
  );
}

export default StaffLogin;
