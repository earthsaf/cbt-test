const { Exam, Question, Answer, Class, Subject } = require('../models');
const { Op } = require('sequelize');

exports.listExams = async (req, res) => {
  const classId = req.user.ClassId || req.user.class_id;
  if (!req.user || !classId) {
    return res.status(400).json({ error: 'User class not found' });
  }
  const now = new Date();
  // Disable caching – each student may have different exam list
  res.set('Cache-Control', 'no-store');

  const exams = await Exam.findAll({
    where: {
      ClassId: classId,
      status: 'active',
      [Op.or]: [
        { startTime: null },
        { startTime: { [Op.lte]: now } }
      ],
    },
    order: [['startTime', 'DESC']],
  });
  res.json(exams);
};

exports.createExam = async (req, res) => {
  const { title, classId, subjectId, status } = req.body;
  
  if (!title || !classId || !subjectId || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const exam = await Exam.create({
      title,
      ClassId: classId,
      SubjectId: subjectId,
      status,
      startTime: new Date(), // Set current time as start time
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // Set end time 2 hours from now
    });
    
    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

exports.addQuestions = async (req, res) => {
  const examId = req.params.id;
  const questions = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Questions must be an array' });
  }

  try {
    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const createdQuestions = await Promise.all(
      questions.map(async (q) => {
        const question = await Question.create({
          ...q,
          ExamId: examId
        });
        return question;
      })
    );

    res.status(201).json(createdQuestions);
  } catch (error) {
    console.error('Error adding questions:', error);
    res.status(500).json({ error: 'Failed to add questions' });
  }
};

exports.getQuestions = async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  let questions = await Question.findAll({ where: { ExamId: req.params.id } });
  // Attach options as array if stored as object
  questions = questions.map(q => ({ ...q.toJSON(), options: Array.isArray(q.options) ? q.options : Object.values(q.options || {}) }));
  if (exam.scramble) {
    // Shuffle questions array
    questions = questions.sort(() => Math.random() - 0.5);
  }
  res.json({ durationMinutes: exam.durationMinutes || 30, questions });
};

exports.autosaveAnswers = async (req, res) => {
  // Save answers (not implemented for brevity)
  res.json({ ok: true });
};

exports.submitAnswers = async (req, res) => {
  const { answers } = req.body;
  const examId = req.params.id || req.body.examId;
  const userId = req.user.id;
  if (!Array.isArray(answers) && typeof answers !== 'object') {
    return res.status(400).json({ error: 'Answers must be an array or object' });
  }
  // Remove old answers for this user/exam
  await Answer.destroy({ where: { UserId: userId, ExamId: examId } });
  // Save new answers
  let correct = 0;
  let total = 0;
  const questions = await Question.findAll({ where: { ExamId: examId } });
  for (const q of questions) {
    const ans = Array.isArray(answers) ? answers.find(a => a.questionId === q.id) : answers[q.id];
    if (!ans) continue;
    let userAnswer = Array.isArray(answers) ? ans.answer : ans;
    // Ensure options array
    const optsArray = Array.isArray(q.options) ? q.options : Object.values(q.options || {});
    // If answers sent as numeric index, convert to option text
    // The user's answer is text, but the correct answer from DB is an index.
    // We must convert the correct answer's index to its text equivalent for comparison.
    const correctText = optsArray[q.answer];
    await Answer.create({ UserId: userId, ExamId: examId, QuestionId: q.id, answer: userAnswer });
    total++;
    if (userAnswer === correctText) correct++;
  }
  res.json({ ok: true, score: correct, total });
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
    if (!a.Question) return; // Skip if Question is missing
    if (!history[a.ExamId]) history[a.ExamId] = { exam: a.Exam, answers: [], score: 0, total: 0 };
    history[a.ExamId].answers.push({
      question: a.Question.text,
      yourAnswer: a.answer,
      correct: a.answer === (Array.isArray(a.Question.options) ? a.Question.options[a.Question.answer] : Object.values(a.Question.options || {})[a.Question.answer]),
      correctAnswer: (Array.isArray(a.Question.options) ? a.Question.options[a.Question.answer] : Object.values(a.Question.options || {})[a.Question.answer]),
    });
    history[a.ExamId].total += 1;
    const correctAnswerText = Array.isArray(a.Question.options) ? a.Question.options[a.Question.answer] : Object.values(a.Question.options || {})[a.Question.answer];
    if (a.answer === correctAnswerText) history[a.ExamId].score += 1;
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
    const correctAnswerText = Array.isArray(a.Question.options) ? a.Question.options[a.Question.answer] : Object.values(a.Question.options || {})[a.Question.answer];
    if (a.answer === correctAnswerText) {
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