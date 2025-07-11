import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [examId, setExamId] = useState('');
  const [invigilatorCode, setInvigilatorCode] = useState('');
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'invigilator') {
      // Fetch exams for invigilator role
      const fetchExams = async () => {
        try {
          const response = await fetch('/api/admin/exams');
          if (response.ok) {
            const data = await response.json();
            setExams(data);
          }
        } catch (err) {
          console.error('Failed to fetch exams:', err);
          setExams([]);
        }
      };
      fetchExams();
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      let credentials;
      if (role === 'invigilator') {
        credentials = { role, examId, invigilatorCode };
      } else {
        credentials = { username, password, role };
      }

      const result = await login(credentials);
      
      if (result && result.success) {
        // Redirect based on role
        const pendingExamId = localStorage.getItem('pendingExamId');
        
        if (role === 'student' && pendingExamId) {
          localStorage.removeItem('pendingExamId');
          navigate(`/exam/${pendingExamId}`);
        } else if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'teacher') {
          navigate('/teacher');
        } else if (role === 'invigilator') {
          navigate('/proctor');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result?.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 32, background: '#f9f9f9', borderRadius: 8 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
          <option value="invigilator">Invigilator</option>
        </select>
        {role === 'invigilator' ? (
          <>
            <select value={examId} onChange={e => setExamId(e.target.value)} required style={{ marginBottom: 12 }}>
              <option value="">Select Exam</option>
              {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
            </select>
            <input placeholder="Invigilator Code" value={invigilatorCode} onChange={e => setInvigilatorCode(e.target.value)} required style={{ marginBottom: 12 }} />
          </>
        ) : (
          <>
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ marginBottom: 12 }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginBottom: 12 }} />
          </>
        )}
        <button type="submit" style={{ width: '100%', padding: 8, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}>Login</button>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  );
}

export default LoginPage;