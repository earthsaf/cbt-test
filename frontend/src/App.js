import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamPage from './pages/ExamPage';
import AdminPanel from './pages/AdminPanel';
import ProctoringPage from './pages/ProctoringPage';
import TeacherPanel from './pages/TeacherPanel';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/student-login" replace />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/test" element={<div>Test route working!</div>} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/exam/:examId" 
            element={
              <ProtectedRoute>
                <ExamPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/proctor" 
            element={
              <ProtectedRoute requiredRole="invigilator">
                <ProctoringPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher" 
            element={
              <ProtectedRoute requiredRole="teacher">
                <TeacherPanel />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/student-login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );

}

export default App;