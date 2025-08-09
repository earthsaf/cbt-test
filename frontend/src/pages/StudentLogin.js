import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function StudentLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login({ 
        username, 
        password, 
        role: 'student' 
      });
      
      if (result && result.success) {
        // Redirect to pending exam if set
        const pendingExamId = localStorage.getItem('pendingExamId');
        if (pendingExamId) {
          localStorage.removeItem('pendingExamId');
          navigate(`/exam/${pendingExamId}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result?.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToStaff = () => {
    navigate('/staff-login');
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
            disabled={isLoading}
            aria-label={isLoading ? 'Signing in...' : 'Sign in to your student account'}
            aria-busy={isLoading}
            style={{
              width: '100%',
              padding: '12px 0',
              background: isLoading ? '#a5d6ff' : 'linear-gradient(90deg, #1976d2, #43cea2)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              border: 'none',
              borderRadius: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              marginBottom: 8,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={e => !isLoading && (e.target.style.background = 'linear-gradient(90deg, #125ea2, #2fa07a)')}
            onMouseOut={e => !isLoading && (e.target.style.background = 'linear-gradient(90deg, #1976d2, #43cea2)')}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  borderTopColor: '#fff',
                  animation: 'spin 1s ease-in-out infinite',
                }}></div>
                <style>{
                  `@keyframes spin { to { transform: rotate(360deg); } }`
                }</style>
                Logging in...
              </>
            ) : 'Login to Begin'}
          </button>
          {error && <div style={{ color: 'crimson', marginTop: 8, fontWeight: 500 }}>{error}</div>}
        </form>
        <div style={{ color: '#666', fontSize: 14, marginTop: 16 }}>
          Having trouble logging in? Contact your teacher.
        </div>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={handleSwitchToStaff}
            aria-label="Switch to staff login"
            style={{
              background: 'none',
              border: 'none',
              color: '#1976d2',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '10px',
              fontSize: '0.9rem',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s',
              ':hover': {
                background: 'rgba(25, 118, 210, 0.1)'
              }
            }}
          >
            Staff? Sign in here
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentLogin;
