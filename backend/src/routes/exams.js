const express = require('express');
const examController = require('../controllers/examController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');
const teacherExam = require('../controllers/teacherExamController');
const router = express.Router();

// Regular user routes
router.get('/', requireAuth, examController.listExams);
router.get('/:id/questions', requireAuth, examController.getQuestions);
router.post('/:id/autosave', requireAuth, examController.autosaveAnswers);
router.post('/:id/submit', requireAuth, examController.submitAnswers);
router.get('/history', requireAuth, examController.examHistory);
router.get('/:id/analytics', requireAuth, requireRole('student', 'teacher'), examController.examAnalytics);

// Admin routes for teachers
router.post('/', requireAuth, requireRole('teacher'), examController.createExam);
router.post('/:id/questions', requireAuth, requireRole('teacher'), examController.addQuestions);

router.get('/teacher/exams', requireAuth, requireRole('teacher'), teacherExam.listTeacherExams);
router.delete('/teacher/exams/:id', requireAuth, requireRole('teacher'), teacherExam.deleteExam);

module.exports = router;