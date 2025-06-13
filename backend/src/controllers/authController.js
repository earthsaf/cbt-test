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
    return res.json({ token });
  } else {
    // Normal user login
    const user = await User.findOne({ where: { username, role } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  }
}; 