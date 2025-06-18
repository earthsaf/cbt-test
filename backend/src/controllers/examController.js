const { Exam, Question, Answer } = require('../models');

exports.listExams = async (req, res) => {
  // List exams for user's class
  const exams = await Exam.findAll();
  res.json(exams);
};

exports.getQuestions = async (req, res) => {
  const questions = await Question.findAll({ where: { examId: req.params.id } });
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
    where: { userId: req.user.id },
    include: [Exam, Question],
  });
  // Group by exam
  const history = {};
  answers.forEach(a => {
    if (!history[a.examId]) history[a.examId] = { exam: a.Exam, answers: [], score: 0, total: 0 };
    history[a.examId].answers.push({
      question: a.Question.text,
      yourAnswer: a.answer,
      correct: a.answer === a.Question.answer,
      correctAnswer: a.Question.answer,
    });
    history[a.examId].total += 1;
    if (a.answer === a.Question.answer) history[a.examId].score += 1;
  });
  res.json(Object.values(history));
};

// Analytics for students and teachers
exports.examAnalytics = async (req, res) => {
  const examId = req.params.id;
  const answers = await Answer.findAll({
    where: { examId },
    include: [Question, { model: require('../models').User }],
  });
  // Calculate scores per user
  const scores = {};
  const questionStats = {};
  answers.forEach(a => {
    // Score calculation
    if (!scores[a.userId]) scores[a.userId] = { user: a.User?.username || a.userId, score: 0 };
    if (a.answer === a.Question.answer) {
      scores[a.userId].score += 1;
    } else {
      // Track failed questions
      if (!questionStats[a.questionId]) questionStats[a.questionId] = { text: a.Question.text, fails: 0 };
      questionStats[a.questionId].fails += 1;
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