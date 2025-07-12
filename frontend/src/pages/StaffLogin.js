import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'invigilator') navigate('/proctor');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login({ username, password, role });
      if (result.success) {
        // The AuthProvider will handle the redirection based on user role
        return;
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
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
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 8,
              background: loading ? '#b0b3c6' : '#1976d2',
              color: 'white',
              border: 'none',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span>Signing in...</span>
                <div className="spinner" style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  borderTopColor: '#fff',
                  animation: 'spin 1s ease-in-out infinite',
                }} />
              </>
            ) : 'Sign In'}
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
