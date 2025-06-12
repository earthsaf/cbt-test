const express = require('express');
const admin = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');
const router = express.Router();

router.get('/users', requireAuth, requireRole('admin'), admin.manageUsers);
router.get('/classes', requireAuth, requireRole('admin'), admin.manageClasses);
router.get('/exams', requireAuth, requireRole('admin'), admin.manageExams);
router.get('/analytics', requireAuth, requireRole('admin'), admin.analytics);

// New: Retake, edit user, edit question, get results
router.post('/retake', requireAuth, requireRole('admin'), admin.retakeExam);
router.put('/users/:id', requireAuth, requireRole('admin'), admin.editUser);
router.put('/exams/:examId/questions/:questionId', requireAuth, requireRole('admin'), admin.editQuestion);
router.get('/exams/:examId/results', requireAuth, requireRole('admin'), admin.examResults);
router.get('/exams/:examId/export', requireAuth, requireRole('admin'), admin.exportExamResults);

module.exports = router; 