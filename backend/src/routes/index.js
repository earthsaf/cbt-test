const express = require('express');
const router = express.Router();

// Health check route (no auth required)
router.use('/health', require('./health'));

// Auth routes
router.use('/auth', require('./auth'));

// Protected routes
const { requireAuth } = require('../middlewares/auth');
router.use('/exams', requireAuth, require('./exams'));
router.use('/admin', requireAuth, require('./admin'));
router.use('/proctoring', requireAuth, require('./proctoring'));
router.use('/student', requireAuth, require('./student'));
router.use('/teacher', requireAuth, require('./teacher'));

module.exports = router;