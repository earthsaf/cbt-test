const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/exams', require('./exams'));
router.use('/admin', require('./admin'));
router.use('/proctoring', require('./proctoring'));
const studentRoutes = require('./student');
const teacherRoutes = require('./teacher');

router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);

module.exports = router;