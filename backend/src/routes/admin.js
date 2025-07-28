const express = require('express');
const admin = require('../controllers/adminController');
const examController = require('../controllers/examController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');
const multer = require('multer');
const upload = multer();
const router = express.Router();

// All teacher-specific routes have been moved to teacher.js for better separation of concerns.

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
// Generic profile routes removed. Profile management is now handled in role-specific route files (e.g., teacher.js).



// New: Subject management
router.get('/subjects', requireAuth, requireRole('admin'), admin.listSubjects);
router.post('/subjects', requireAuth, requireRole('admin'), admin.addSubject);
router.delete('/subjects/:id', requireAuth, requireRole('admin'), admin.deleteSubject);

// New: Teacher-class-subject assignment management
router.get('/teacher-assignments', requireAuth, requireRole('admin'), admin.listTeacherAssignments);
router.post('/teacher-assignments', requireAuth, requireRole('admin'), admin.assignTeacher);
router.delete('/teacher-assignments/:id', requireAuth, requireRole('admin'), admin.removeTeacherAssignment);

// Teacher question management routes removed. This is now handled exclusively in teacher.js.

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

// Insecure debug routes have been removed.

module.exports = router;