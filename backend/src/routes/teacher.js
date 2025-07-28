const express = require('express');
const router = express.Router();
const { authenticate, isTeacher } = require('../middleware/auth');
const teacherController = require('../controllers/teacherController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// All routes in this file are protected and require teacher role
router.use(authenticate, isTeacher);

// Get teacher's assignments (classes and subjects they teach)
router.get('/assignments', teacherController.getAssignments);

// Get students in a specific class taught by the teacher
router.get('/classes/:classId/students', teacherController.getStudentsByClass);

// Exam and Question Management
router.post('/exams', teacherController.createExam); // Create a new exam shell
router.get('/assignments/:assignmentId/questions', teacherController.getQuestions);
router.post('/assignments/:assignmentId/questions/upload', upload.single('file'), teacherController.uploadQuestions);
router.put('/questions/:questionId', teacherController.updateQuestion);
router.delete('/questions/:questionId', teacherController.deleteQuestion);
router.delete('/assignments/:assignmentId/questions', teacherController.deleteAllQuestionsForAssignment);

// Teacher Profile Management
router.get('/profile', teacherController.getProfile);
router.put('/profile', teacherController.updateProfile);

// Announcements
router.post('/announcements', teacherController.createAnnouncement);
router.get('/announcements', teacherController.getAnnouncements);

module.exports = router;
