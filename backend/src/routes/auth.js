const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');
const router = express.Router();

router.post('/login', authController.login);
router.post('/debug-login', authController.debugLogin); // Debug endpoint for login troubleshooting
router.get('/test', requireAuth, authController.testAuth);

module.exports = router;