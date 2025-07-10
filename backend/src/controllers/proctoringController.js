const Student = require('../models/Student');
const Exam = require('../models/Exam');
const Alert = require('../models/Alert');
const io = require('../services/socket');

// Real-time monitoring
exports.getEvents = async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      where: { examId: req.query.examId },
      order: [['timestamp', 'DESC']],
      limit: 50
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events' });
  }
};

exports.flagStudent = async (req, res) => {
  try {
    const { studentId, reason, screenshot } = req.body;
    
    const alert = new Alert({
      studentId,
      examId: req.query.examId,
      reason,
      screenshot,
      timestamp: new Date(),
      severity: 'high'
    });
    
    await alert.save();
    
    // Notify invigilators via socket
    io.emit('proctor-alert', {
      userId: studentId,
      message: reason,
      timestamp: new Date(),
      severity: 'high'
    });
    
    res.json({ message: 'Student flagged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error flagging student' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { examId: req.query.examId }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students' });
  }
};

exports.getScreenshots = async (req, res) => {
  try {
    const screenshots = await Student.findOne({
      where: {
        examId: req.query.examId,
        id: req.params.studentId
      },
      attributes: ['screenshots']
    });
    res.json(screenshots);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching screenshots' });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      where: {
        examId: req.query.examId,
        studentId: req.query.studentId
      }
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts' });
  }
};

// Invigilator controls
exports.forceSubmit = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findOne({
      where: { id: studentId }
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    await student.update({ status: 'submitted' });
    io.to(studentId).emit('force-submit');
    res.json({ message: 'Exam forced to submit' });
  } catch (error) {
    res.status(500).json({ message: 'Error forcing submit' });
  }
};

exports.controlExam = async (req, res) => {
  try {
    const { studentId, action } = req.body;
    const student = await Student.findOne({
      where: { id: studentId }
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    student.status = action === 'pause' ? 'paused' : 'active';
    await student.save();
    
    // Notify student via socket
    io.to(student.socketId).emit('exam-control', { action });
    
    res.json({ message: 'Exam control updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error controlling exam' });
  }
};

exports.lockStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findOne({
      where: { id: studentId }
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    await student.update({ status: 'locked' });
    io.to(studentId).emit('lock-screen');
    res.json({ message: 'Student locked' });
  } catch (error) {
    res.status(500).json({ message: 'Error locking student' });
  }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const students = await Student.findAll({
      where: { examId: req.query.examId }
    });
    students.forEach(student => {
      io.to(student.id).emit('broadcast-message', { message });
    });
    res.json({ message: 'Message broadcasted' });
  } catch (error) {
    res.status(500).json({ message: 'Error broadcasting message' });
  }
};

// Session management
exports.getSessionSummary = async (req, res) => {
  try {
    const { examId } = req.query;
    const summary = {
      students: await Student.findAll({
        where: { examId }
      }),
      alerts: await Alert.findAll({
        where: { examId }
      }),
      screenshots: await Student.findAll({
        where: { examId },
        attributes: ['screenshots']
      })
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching session summary' });
  }
};

exports.getStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ where: { id: studentId } });
    res.json({ status: student.status });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student status' });
  }
};