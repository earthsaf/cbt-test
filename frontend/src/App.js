import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamPage from './pages/ExamPage';
import AdminPanel from './pages/AdminPanel';
import ProctoringPage from './pages/ProctoringPage';
import TeacherPanel from './pages/TeacherPanel';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/student-login" replace />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exam/:examId" element={<ExamPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/proctor" element={<ProctoringPage />} />
          <Route path="/teacher" element={<TeacherPanel />} />
          <Route path="*" element={<Navigate to="/student-login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );

}

export default App;