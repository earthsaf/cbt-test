const { User, Class, Exam, Question, Answer, Session, Log } = require('../models');
const { getSocketIO } = require('../services/proctoring');

exports.manageUsers = async (req, res) => {
  const users = await User.findAll({ include: Class });
  res.json(users);
};
exports.manageClasses = async (req, res) => {
  const classes = await Class.findAll();
  res.json(classes);
};
exports.manageExams = async (req, res) => {
  const exams = await Exam.findAll({ include: Class });
  res.json(exams);
};
exports.analytics = (req, res) => res.json({ message: 'Analytics (not implemented)' });

// Retake exam for a class or user
exports.retakeExam = async (req, res) => {
  const { examId, classId, userId } = req.body;
  let where = { examId };
  if (classId) {
    const users = await User.findAll({ where: { classId } });
    where.userId = users.map(u => u.id);
  } else if (userId) {
    where.userId = userId;
  }
  await Session.destroy({ where });
  await Log.create({ userId: req.user.id, action: 'retakeExam', details: JSON.stringify({ examId, classId, userId }) });
  res.json({ ok: true, message: 'Retake triggered' });
};

// Edit user details
exports.editUser = async (req, res) => {
  const { name, email, classId } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (name) user.username = name;
  if (email) user.email = email;
  if (classId) user.classId = classId;
  await user.save();
  await Log.create({ userId: req.user.id, action: 'editUser', details: JSON.stringify({ userId: user.id }) });
  res.json({ ok: true, user });
};

// Edit question (live)
exports.editQuestion = async (req, res) => {
  const { text, options, answer } = req.body;
  const question = await Question.findOne({ where: { id: req.params.questionId, examId: req.params.examId } });
  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (text) question.text = text;
  if (options) question.options = options;
  if (answer) question.answer = answer;
  question.version += 1;
  await question.save();
  await Log.create({ userId: req.user.id, action: 'editQuestion', details: JSON.stringify({ questionId: question.id }) });
  // Emit live update to students
  const io = getSocketIO();
  if (io) {
    io.emit(`question-update-exam-${req.params.examId}`, {
      questionId: question.id,
      text: question.text,
      options: question.options,
      version: question.version,
    });
  }
  res.json({ ok: true, question });
};

// Get exam results for analytics
exports.examResults = async (req, res) => {
  const answers = await Answer.findAll({
    include: [User, Question],
    where: { examId: req.params.examId },
  });
  // Calculate scores per user
  const scores = {};
  answers.forEach(a => {
    if (!scores[a.userId]) scores[a.userId] = { user: a.User.username, score: 0 };
    if (a.answer === a.Question.answer) scores[a.userId].score += 1;
  });
  const resultArr = Object.values(scores);
  const highest = Math.max(...resultArr.map(r => r.score), 0);
  const lowest = Math.min(...resultArr.map(r => r.score), highest);
  const avg = resultArr.length ? (resultArr.reduce((a, b) => a + b.score, 0) / resultArr.length).toFixed(2) : 0;
  res.json({ results: resultArr, highest, lowest, avg });
};

// Export exam results as CSV
const { Parser } = require('json2csv');
exports.exportExamResults = async (req, res) => {
  const answers = await Answer.findAll({
    include: [User, Question],
    where: { examId: req.params.examId },
  });
  const data = answers.map(a => ({
    user: a.User.username,
    question: a.Question.text,
    answer: a.answer,
    correct: a.answer === a.Question.answer,
  }));
  const parser = new Parser();
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('results.csv');
  res.send(csv);
}; 