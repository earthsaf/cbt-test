import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [examId, setExamId] = useState('');
  const [invigilatorCode, setInvigilatorCode] = useState('');
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'invigilator') {
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      axios.get(`${apiUrl}/admin/exams`, { headers: { Authorization: '' } })
        .then(res => setExams(res.data))
        .catch(() => setExams([]));
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let payload;
      if (role === 'invigilator') {
        payload = { role, examId, invigilatorCode };
      } else {
        payload = { username, password, role };
      }
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const res = await axios.post(`${apiUrl}/auth/login`, payload);
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', role);
        // Redirect to pending exam if set
        const pendingExamId = localStorage.getItem('pendingExamId');
        if (role === 'student' && pendingExamId) {
          localStorage.removeItem('pendingExamId');
          navigate(`/exam/${pendingExamId}`);
          return;
        }
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'teacher') {
          navigate('/teacher');
        } else if (role === 'invigilator') {
          navigate('/proctor');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Login failed: No token received.');
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