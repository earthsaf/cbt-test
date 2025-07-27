import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ username, password, role: 'admin' });
      if (result.success) {
        navigate('/admin');
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #23243a 0%, #4b2c4e 100%)',
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
          fontSize: 30,
          fontWeight: 800,
          marginBottom: 8,
          color: '#23243a',
          letterSpacing: 1,
        }}>
          Admin Access
        </h1>
        <div style={{ color: '#444', fontSize: 16, marginBottom: 32 }}>
          Enter your credentials to access the CBT Administration Panel.
        </div>
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <label style={{ fontWeight: 700, color: '#23243a', marginBottom: 4, display: 'block' }}>Admin Username</label>
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
            Login as Admin
          </button>
          {error && <div style={{ color: 'crimson', marginTop: 8, fontWeight: 500 }}>{error}</div>}
        </form>
        <div style={{ color: '#666', fontSize: 14, marginTop: 16 }}>
          Only authorized personnel are granted access. Contact the system administrator if you have trouble logging in.
        </div>
        <div style={{ marginTop: 18 }}>
          <span style={{ color: '#23243a', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/staff-login')}>
            Back to Staff Login
          </span>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
