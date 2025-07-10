const Student = require('../models/Student');
const Exam = require('../models/Exam');
const Alert = require('../models/Alert');
const io = require('../services/socket');

// Real-time monitoring
exports.getEvents = async (req, res) => {
  try {
    const alerts = await Alert.find({ examId: req.query.examId })
      .sort({ timestamp: -1 })
      .limit(50);
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
    const students = await Student.find({ examId: req.query.examId });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students' });
  }
};

exports.getScreenshots = async (req, res) => {
  try {
    const { studentId } = req.params;
    const screenshots = await Student.findOne({ _id: studentId })
      .select('screenshots')
      .populate('screenshots');
    res.json(screenshots);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching screenshots' });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ examId: req.query.examId })
      .sort({ timestamp: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts' });
  }
};

// Invigilator controls
exports.forceSubmit = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findOne({ _id: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    student.status = 'submitted';
    await student.save();
    
    // Notify student via socket
    io.to(student.socketId).emit('exam-force-submit');
    
    res.json({ message: 'Exam force submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error force submitting exam' });
  }
};

exports.controlExam = async (req, res) => {
  try {
    const { studentId, action } = req.body;
    const student = await Student.findOne({ _id: studentId });
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
    const student = await Student.findOne({ _id: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    student.status = 'locked';
    await student.save();
    
    // Notify student via socket
    io.to(student.socketId).emit('student-locked');
    
    res.json({ message: 'Student locked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error locking student' });
  }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const examId = req.query.examId;
    
    const students = await Student.find({ examId });
    students.forEach(student => {
      io.to(student.socketId).emit('broadcast-message', { message });
    });
    
    res.json({ message: 'Message broadcasted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error broadcasting message' });
  }
};

// Session management
exports.getSessionSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ _id: studentId })
      .populate('alerts')
      .populate('screenshots');
    
    const summary = {
      studentInfo: {
        name: student.name,
        rollNumber: student.rollNumber,
        status: student.status
      },
      alerts: student.alerts,
      screenshots: student.screenshots,
      behaviorHistory: student.behaviorHistory
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching session summary' });
  }
};

exports.getStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ _id: studentId });
    res.json({ status: student.status });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student status' });
  }
};