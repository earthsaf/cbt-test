const express = require('express');
const proctor = require('../controllers/proctoringController');
const router = express.Router();

router.get('/events', proctor.getEvents);
router.post('/flag', proctor.flagStudent);

module.exports = router; 