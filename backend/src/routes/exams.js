const express = require('express');
const examController = require('../controllers/examController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');
const router = express.Router();

// Regular user routes
router.get('/exams', requireAuth, examController.listExams);
router.get('/exams/:id/questions', requireAuth, examController.getQuestions);
router.post('/exams/:id/autosave', requireAuth, examController.autosaveAnswers);
router.post('/exams/:id/submit', requireAuth, examController.submitAnswers);
router.get('/exams/history', requireAuth, examController.examHistory);
router.get('/exams/:id/analytics', requireAuth, requireRole('student', 'teacher'), examController.examAnalytics);

// Admin routes for teachers
router.post('/exams', requireAuth, requireRole('teacher'), examController.createExam);
router.post('/exams/:id/questions', requireAuth, requireRole('teacher'), examController.addQuestions);

module.exports = router;