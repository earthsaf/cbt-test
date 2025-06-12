const express = require('express');
const examController = require('../controllers/examController');
const { requireAuth } = require('../middlewares/auth');
const router = express.Router();

router.get('/', requireAuth, examController.listExams);
router.get('/:id/questions', requireAuth, examController.getQuestions);
router.post('/:id/autosave', requireAuth, examController.autosaveAnswers);
router.post('/:id/submit', requireAuth, examController.submitAnswers);
router.get('/history', requireAuth, examController.examHistory);

module.exports = router; 