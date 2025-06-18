const { User, Class, Exam, Question, Answer, Session, Log, Subject, TeacherClassSubject } = require('../models');
const { getSocketIO } = require('../services/proctoring');
const { Op } = require('sequelize');

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
  let where = { ExamId: examId };
  if (classId) {
    const users = await User.findAll({ where: { ClassId: classId } });
    where.UserId = users.map(u => u.id);
  } else if (userId) {
    where.UserId = userId;
  }
  await Session.destroy({ where });
  await Log.create({ UserId: req.user.id, action: 'retakeExam', details: JSON.stringify({ examId, classId, userId }) });
  res.json({ ok: true, message: 'Retake triggered' });
};

// Edit user details
exports.editUser = async (req, res) => {
  const { name, email, classId } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (name) user.username = name;
  if (email) user.email = email;
  if (classId) user.ClassId = classId;
  await user.save();
  await Log.create({ UserId: req.user.id, action: 'editUser', details: JSON.stringify({ userId: user.id }) });
  res.json({ ok: true, user });
};

// Edit question (live)
exports.editQuestion = async (req, res) => {
  const { id } = req.params;
  const { text, options, answer } = req.body;
  const question = await Question.findByPk(id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (text) question.text = text;
  if (options) question.options = options;
  if (answer) question.answer = answer;
  await question.save();
  await Log.create({ userId: req.user.id, action: 'editQuestion', details: JSON.stringify({ questionId: question.id }) });
  // Emit live update to students
  const io = getSocketIO();
  if (io) {
    io.emit(`question-update-exam-${question.examId}`, {
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
    where: { ExamId: req.params.examId },
  });
  // Calculate scores per user
  const scores = {};
  answers.forEach(a => {
    if (!scores[a.UserId]) scores[a.UserId] = { user: a.User.username, score: 0 };
    if (a.answer === a.Question.answer) scores[a.UserId].score += 1;
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
    where: { ExamId: req.params.examId },
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

// Create user (admin only)
exports.createUser = async (req, res) => {
  const { username, password, role, name, email, classId, telegramId } = req.body;
  if (!['student', 'teacher'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const exists = await User.findOne({ where: { username } });
  if (exists) return res.status(400).json({ error: 'Username already exists' });
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash, role, name, email, classId, telegramId });
  res.json({ ok: true, user });
};

// Generate/view invigilator code for an exam
exports.setInvigilatorCode = async (req, res) => {
  const { examId } = req.body;
  const code = Math.random().toString(36).substr(2, 8).toUpperCase();
  const exam = await Exam.findByPk(examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  exam.invigilatorCode = code;
  await exam.save();
  res.json({ ok: true, code });
};
exports.getInvigilatorCode = async (req, res) => {
  const { examId } = req.query;
  const exam = await Exam.findByPk(examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  res.json({ code: exam.invigilatorCode });
};

// Profile endpoints
exports.getProfile = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
};
exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (name) user.name = name;
  if (email) user.email = email;
  if (password) {
    const bcrypt = require('bcrypt');
    user.passwordHash = await bcrypt.hash(password, 10);
  }
  await user.save();
  res.json({ ok: true, user });
};

exports.listSubjects = async (req, res) => {
  const subjects = await Subject.findAll();
  res.json(subjects);
};
exports.addSubject = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const exists = await Subject.findOne({ where: { name } });
  if (exists) return res.status(400).json({ error: 'Subject already exists' });
  const subject = await Subject.create({ name });
  res.json({ ok: true, subject });
};
exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  await Subject.destroy({ where: { id } });
  res.json({ ok: true });
};

exports.listTeacherAssignments = async (req, res) => {
  const assignments = await TeacherClassSubject.findAll({
    include: [
      { model: User, as: 'teacher', attributes: ['id', 'username', 'name'] },
      { model: Class, attributes: ['id', 'name'] },
      { model: Subject, attributes: ['id', 'name'] },
    ],
  });
  res.json(assignments);
};
exports.assignTeacher = async (req, res) => {
  const { teacherId, classId, subjectId } = req.body;
  if (!teacherId || !classId || !subjectId) return res.status(400).json({ error: 'All fields required' });
  const exists = await TeacherClassSubject.findOne({ where: { teacherId, classId, subjectId } });
  if (exists) return res.status(400).json({ error: 'Assignment already exists' });
  const assignment = await TeacherClassSubject.create({ teacherId, classId, subjectId });
  res.json({ ok: true, assignment });
};
exports.removeTeacherAssignment = async (req, res) => {
  const { id } = req.params;
  await TeacherClassSubject.destroy({ where: { id } });
  res.json({ ok: true });
};

exports.uploadQuestions = async (req, res) => {
  const { assignmentId } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const allowed = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (!allowed.includes(file.mimetype) && ext !== 'txt' && ext !== 'docx') {
    return res.status(400).json({ error: 'Only .txt or .docx files are allowed' });
  }
  // TODO: Implement file parsing and question creation
  res.json({ ok: true, message: 'Upload received (not implemented)' });
};

exports.listAssignmentQuestions = async (req, res) => {
  const { assignmentId } = req.params;
  const assignment = await TeacherClassSubject.findByPk(assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  // Find all exams for this class/subject/teacher
  // For simplicity, assume one exam per assignment (or extend as needed)
  const exam = await Exam.findOne({ where: { ClassId: assignment.classId, SubjectId: assignment.subjectId, createdBy: assignment.teacherId } });
  if (!exam) return res.json([]);
  const questions = await Question.findAll({ where: { ExamId: exam.id } });
  res.json(questions);
};

exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;
  await Question.destroy({ where: { id } });
  res.json({ ok: true });
};

exports.deleteAssignmentQuestions = async (req, res) => {
  const { assignmentId } = req.params;
  const assignment = await TeacherClassSubject.findByPk(assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  const exam = await Exam.findOne({ where: { ClassId: assignment.classId, SubjectId: assignment.subjectId, createdBy: assignment.teacherId } });
  if (!exam) return res.json({ ok: true });
  await Question.destroy({ where: { ExamId: exam.id } });
  res.json({ ok: true });
};

exports.addClass = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const exists = await Class.findOne({ where: { name } });
  if (exists) return res.status(400).json({ error: 'Class already exists' });
  const c = await Class.create({ name });
  res.json({ ok: true, class: c });
};

exports.createAssignmentQuestions = async (req, res) => {
  const { assignmentId } = req.params;
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Questions array required' });
  }
  const assignment = await TeacherClassSubject.findByPk(assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  // Find or create exam for this assignment
  let exam = await Exam.findOne({ where: { ClassId: assignment.classId, SubjectId: assignment.subjectId, createdBy: assignment.teacherId } });
  if (!exam) {
    exam = await Exam.create({
      ClassId: assignment.classId,
      SubjectId: assignment.subjectId,
      createdBy: assignment.teacherId,
      title: `Exam for ${assignment.classId}-${assignment.subjectId}`,
      status: 'draft',
    });
  }
  // Create questions
  const created = [];
  for (const q of questions) {
    if (!q.text || !q.options || !q.answer) continue;
    created.push(await Question.create({
      ExamId: exam.id,
      text: q.text,
      options: q.options,
      answer: q.answer,
      type: 'mcq',
    }));
  }
  res.json({ ok: true, created: created.length });
};

// List exams with search/filter
exports.listExams = async (req, res) => {
  const { search = '', classId, subjectId } = req.query;
  const where = {};
  if (search) where.title = { [Op.iLike]: `%${search}%` };
  if (classId) where.classId = classId;
  if (subjectId) where.subjectId = subjectId;
  const exams = await Exam.findAll({
    where,
    include: [Class, Subject],
    order: [['createdAt', 'DESC']],
  });
  res.json(exams);
};

// Get all questions for an exam
exports.getExamQuestions = async (req, res) => {
  const exam = await Exam.findByPk(req.params.examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  const questions = await Question.findAll({ where: { ExamId: exam.id } });
  res.json(questions);
};

// Update exam settings (startTime, durationMinutes, scramble)
exports.updateExamSettings = async (req, res) => {
  const { startTime, durationMinutes, scramble } = req.body;
  const exam = await Exam.findByPk(req.params.examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (startTime !== undefined) exam.startTime = startTime;
  if (durationMinutes !== undefined) exam.durationMinutes = durationMinutes;
  if (scramble !== undefined) exam.scramble = scramble;
  await exam.save();
  res.json({ ok: true, exam });
}; 