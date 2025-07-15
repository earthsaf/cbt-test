const express = require('express');
const admin = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');
const multer = require('multer');
const upload = multer();
const router = express.Router();

// Admin routes
router.get('/users', requireAuth, requireRole('admin'), admin.manageUsers);
router.get('/classes', requireAuth, requireRole('admin'), admin.manageClasses);
router.get('/exams', requireAuth, requireRole('admin'), admin.listExams);
router.get('/analytics', requireAuth, requireRole('admin'), admin.analytics);

// New: Retake, edit user, edit question, get results
router.post('/retake', requireAuth, requireRole('admin'), admin.retakeExam);
router.put('/users/:id', requireAuth, requireRole('admin'), admin.editUser);
router.put('/exams/:examId/questions/:questionId', requireAuth, requireRole('admin'), admin.editQuestion);
router.get('/exams/:examId/results', requireAuth, requireRole('admin'), admin.examResults);
router.get('/exams/:examId/export', requireAuth, requireRole('admin'), admin.exportExamResults);

// New: Create/delete user, set/get invigilator code, get profile, update profile
router.post('/users', requireAuth, requireRole('admin'), admin.createUser);
router.delete('/users/:id', requireAuth, requireRole('admin'), admin.deleteUser);
router.post('/exams/invigilator-code', requireAuth, requireRole('admin'), admin.setInvigilatorCode);
router.get('/exams/invigilator-code', requireAuth, requireRole('admin'), admin.getInvigilatorCode);
// Profile routes (any authenticated user)
router.get('/profile', requireAuth, admin.getProfile);
router.put('/profile', requireAuth, admin.updateProfile);

// Teacher routes
router.get('/my-assignments', requireAuth, requireRole('teacher'), admin.getTeacherAssignments);

// New: Subject management
router.get('/subjects', requireAuth, requireRole('admin'), admin.listSubjects);
router.post('/subjects', requireAuth, requireRole('admin'), admin.addSubject);
router.delete('/subjects/:id', requireAuth, requireRole('admin'), admin.deleteSubject);

// New: Teacher-class-subject assignment management
router.get('/teacher-assignments', requireAuth, requireRole('admin'), admin.listTeacherAssignments);
router.post('/teacher-assignments', requireAuth, requireRole('admin'), admin.assignTeacher);
router.delete('/teacher-assignments/:id', requireAuth, requireRole('admin'), admin.removeTeacherAssignment);

// New: Upload questions
router.post('/upload-questions', requireAuth, upload.single('file'), admin.uploadQuestions);

// New: Teacher-question assignment management
router.get('/assignment-questions/:assignmentId', requireAuth, admin.listAssignmentQuestions);
router.put('/questions/:id', requireAuth, admin.editQuestion);
router.delete('/questions/:id', requireAuth, admin.deleteQuestion);
router.delete('/assignment-questions/:assignmentId', requireAuth, admin.deleteAssignmentQuestions);

// New: Add class
router.post('/classes', requireAuth, requireRole('admin'), admin.addClass);

// New: Batch question creation
router.post('/assignment-questions/:assignmentId', requireAuth, admin.createAssignmentQuestions);

// New: Get exam questions
router.get('/exams/:examId/questions', requireAuth, requireRole('admin'), admin.getExamQuestions);

// New: Update exam settings
router.put('/exams/:examId/settings', requireAuth, requireRole('admin'), admin.updateExamSettings);

// Admin: Start an exam (new, robust)
router.put('/exams/:examId/start', requireAuth, requireRole('admin'), admin.startExam);

// Auto-end exams whose duration has passed
router.post('/exams/auto-end', requireAuth, requireRole('admin'), admin.autoEndExams);

// Debug: Show student class and all exams
router.get('/debug-student-exams', requireAuth, admin.debugStudentExams);

module.exports = router;