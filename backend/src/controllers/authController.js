const { User, Exam } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  const { username, password, role, examId, invigilatorCode } = req.body;
  if (role === 'invigilator') {
    // Invigilator login with code
    if (!examId || !invigilatorCode) return res.status(400).json({ error: 'Exam ID and code required' });
    const exam = await Exam.findByPk(examId);
    if (!exam || exam.invigilatorCode !== invigilatorCode) return res.status(401).json({ error: 'Invalid code or exam' });
    // Issue a token for invigilator session
    const token = jwt.sign({ role: 'invigilator', examId }, process.env.JWT_SECRET, { expiresIn: '4h' });
    // Set as HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 4 * 60 * 60 * 1000
    });
    return res.json({ success: true });
  } else {
    // Normal user login
    const user = await User.findOne({ where: { username, role } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 8 * 60 * 60 * 1000
    });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ success: true });
};

// Test authentication endpoint
exports.testAuth = async (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      classId: req.user.ClassId
    }
  });
};