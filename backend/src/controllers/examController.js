const { Exam, Question, Answer, Class } = require('../models');
const { Op } = require('sequelize');

exports.listExams = async (req, res) => {
  if (!req.user || !req.user.ClassId) {
    return res.status(400).json({ error: 'User class not found' });
  }
  const now = new Date();
  const exams = await Exam.findAll({
    where: {
      ClassId: req.user.ClassId,
      status: 'active',
      startTime: { [Op.lte]: now },
    },
    order: [['startTime', 'DESC']],
  });
  res.json(exams);
};

exports.getQuestions = async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  let questions = await Question.findAll({ where: { ExamId: req.params.id } });
  if (exam.scramble) {
    // Shuffle questions array
    questions = questions.sort(() => Math.random() - 0.5);
  }
  res.json(questions.map(q => ({ ...q.toJSON(), options: q.options || [] })));
};

exports.autosaveAnswers = async (req, res) => {
  // Save answers (not implemented for brevity)
  res.json({ ok: true });
};

exports.submitAnswers = async (req, res) => {
  // Save final answers (not implemented for brevity)
  res.json({ ok: true });
};

// Exam history for a user
exports.examHistory = async (req, res) => {
  const answers = await Answer.findAll({
    where: { UserId: req.user.id },
    include: [Exam, Question],
  });
  // Group by exam
  const history = {};
  answers.forEach(a => {
    if (!history[a.ExamId]) history[a.ExamId] = { exam: a.Exam, answers: [], score: 0, total: 0 };
    history[a.ExamId].answers.push({
      question: a.Question.text,
      yourAnswer: a.answer,
      correct: a.answer === a.Question.answer,
      correctAnswer: a.Question.answer,
    });
    history[a.ExamId].total += 1;
    if (a.answer === a.Question.answer) history[a.ExamId].score += 1;
  });
  res.json(Object.values(history));
};

// Analytics for students and teachers
exports.examAnalytics = async (req, res) => {
  const examId = req.params.id;
  const answers = await Answer.findAll({
    where: { ExamId: examId },
    include: [Question, { model: require('../models').User }],
  });
  // Calculate scores per user
  const scores = {};
  const questionStats = {};
  answers.forEach(a => {
    // Score calculation
    if (!scores[a.UserId]) scores[a.UserId] = { user: a.User?.username || a.UserId, score: 0 };
    if (a.answer === a.Question.answer) {
      scores[a.UserId].score += 1;
    } else {
      // Track failed questions
      if (!questionStats[a.QuestionId]) questionStats[a.QuestionId] = { text: a.Question.text, fails: 0 };
      questionStats[a.QuestionId].fails += 1;
    }
  });
  const resultArr = Object.values(scores);
  const highest = Math.max(...resultArr.map(r => r.score), 0);
  const lowest = Math.min(...resultArr.map(r => r.score), highest);
  const avg = resultArr.length ? (resultArr.reduce((a, b) => a + b.score, 0) / resultArr.length).toFixed(2) : 0;
  // Find most failed question
  let mostFailed = null;
  let maxFails = 0;
  Object.values(questionStats).forEach(q => {
    if (q.fails > maxFails) {
      mostFailed = q;
      maxFails = q.fails;
    }
  });
  res.json({
    results: resultArr,
    highest,
    lowest,
    avg,
    mostFailedQuestion: mostFailed,
  });
};