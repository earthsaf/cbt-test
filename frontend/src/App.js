import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ExamPage from './pages/ExamPage';
import AdminPanel from './pages/AdminPanel';
import ProctoringPage from './pages/ProctoringPage';
import TeacherPanel from './pages/TeacherPanel';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StudentLogin />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam/:examId" element={<ExamPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/proctor" element={<ProctoringPage />} />
        <Route path="/teacher" element={<TeacherPanel />} />
      </Routes>
    </Router>
  );
}

export default App;