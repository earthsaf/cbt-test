const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireAuth } = require('../middlewares/auth');

// Student-specific routes
router.get('/profile', requireAuth, studentController.getProfile);
router.put('/profile', requireAuth, studentController.updateProfile);
router.get('/notifications', requireAuth, studentController.getNotifications);

module.exports = router;
