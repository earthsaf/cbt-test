const express = require('express');
const proctor = require('../controllers/proctoringController');
const router = express.Router();

// Real-time monitoring
router.get('/events', proctor.getEvents);
router.post('/flag', proctor.flagStudent);
router.get('/students', proctor.getStudents);
router.get('/screenshots/:studentId', proctor.getScreenshots);
router.get('/alerts', proctor.getAlerts);

// Invigilator controls
router.post('/force-submit', proctor.forceSubmit);
router.post('/control-exam', proctor.controlExam);
router.post('/lock-student', proctor.lockStudent);
router.post('/broadcast', proctor.broadcastMessage);

// Session management
router.get('/session-summary/:studentId', proctor.getSessionSummary);
router.get('/status/:studentId', proctor.getStudentStatus);

module.exports = router;