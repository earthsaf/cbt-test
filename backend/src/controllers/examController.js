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