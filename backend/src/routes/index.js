const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/exams', require('./exams'));
router.use('/admin', require('./admin'));
router.use('/proctoring', require('./proctoring'));

module.exports = router; 