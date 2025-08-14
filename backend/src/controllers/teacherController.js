const { TeacherClassSubject, Class, Subject, User, Exam, Question, Announcement } = require('../models');
const { Op } = require('sequelize');

exports.getAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const assignments = await TeacherClassSubject.findAll({
      where: { teacherId },
      include: [
        { model: Class, attributes: ['id', 'name'] },
        { model: Subject, attributes: ['id', 'name'] },
      ],
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ error: 'Failed to fetch teacher assignments' });
  }
};

exports.getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    // Verify the teacher is assigned to this class
    const assignment = await TeacherClassSubject.findOne({
      where: { teacherId, classId },
    });

    if (!assignment) {
      return res.status(403).json({ error: 'You are not authorized to view students in this class.' });
    }

    const students = await User.findAll({
      where: { ClassId: classId, role: 'student' },
      attributes: ['id', 'username', 'name', 'email'],
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students by class:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

exports.createExam = async (req, res) => {
  const { title, classId, subjectId, status } = req.body;
  const teacherId = req.user.id;

  if (!title || !classId || !subjectId || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify the teacher is assigned to this class and subject
    const assignment = await TeacherClassSubject.findOne({
      where: { teacherId, classId, subjectId },
    });

    if (!assignment) {
      return res.status(403).json({ error: 'You are not authorized to create an exam for this class and subject.' });
    }

    const exam = await Exam.create({
      title,
      ClassId: classId,
      SubjectId: subjectId,
      status,
      createdBy: teacherId, // Set the creator of the exam
    });

    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;

    const assignment = await TeacherClassSubject.findOne({ where: { id: assignmentId, teacherId } });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found or you do not have permission to access it.' });
    }

    // For simplicity, we'll assume one exam per class/subject combination for a teacher.
    // A more complex system might need to handle multiple exams.
    const exam = await Exam.findOne({ 
      where: { 
        ClassId: assignment.classId, 
        subjectId: assignment.subjectId, 
        createdBy: teacherId 
      } 
    });

    if (!exam) {
      // If no exam exists, it's not an error; there are just no questions yet.
      return res.json([]);
    }

    const questions = await Question.findAll({ where: { ExamId: exam.id } });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

exports.uploadQuestions = async (req, res) => {
  const { assignmentId } = req.body;
  const teacherId = req.user.id;
  const file = req.file;

  if (!file || !assignmentId) {
    return res.status(400).json({ error: 'File and assignment ID are required.' });
  }

  try {
    const assignment = await TeacherClassSubject.findOne({ where: { id: assignmentId, teacherId } });
    if (!assignment) {
      return res.status(403).json({ error: 'Assignment not found or you do not have permission to modify it.' });
    }

    const exam = await Exam.findOne({ 
      where: { 
        ClassId: assignment.classId, 
        subjectId: assignment.subjectId, 
        createdBy: teacherId 
      } 
    });

    if (!exam) {
      return res.status(404).json({ error: 'Corresponding exam not found for this assignment.' });
    }

    const questions = JSON.parse(file.buffer.toString('utf-8'));
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid file format. Expected a JSON array of questions.' });
    }

    const createdQuestions = await Promise.all(
      questions.map(q => Question.create({ ...q, ExamId: exam.id }))
    );

    res.status(201).json(createdQuestions);
  } catch (error) {
    console.error('Error uploading questions:', error);
    res.status(500).json({ error: 'Failed to upload questions.' });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const updatedData = req.body;
    const teacherId = req.user.id;

    const question = await Question.findByPk(questionId, { include: Exam });

    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    if (question.Exam.createdBy !== teacherId) {
      return res.status(403).json({ error: 'You are not authorized to update this question.' });
    }

    await question.update(updatedData);
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question.' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const teacherId = req.user.id;

    const question = await Question.findByPk(questionId, { include: Exam });

    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    if (question.Exam.createdBy !== teacherId) {
      return res.status(403).json({ error: 'You are not authorized to delete this question.' });
    }

    await question.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
};

exports.deleteAllQuestionsForAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;

    const assignment = await TeacherClassSubject.findOne({ where: { id: assignmentId, teacherId } });
    if (!assignment) {
      return res.status(403).json({ error: 'Assignment not found or you do not have permission to modify it.' });
    }

    const exam = await Exam.findOne({ 
      where: { 
        ClassId: assignment.classId, 
        subjectId: assignment.subjectId, 
        createdBy: teacherId 
      } 
    });

    if (!exam) {
      // No exam means no questions to delete, so this is a success.
      return res.status(204).send();
    }

    await Question.destroy({ where: { ExamId: exam.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting all questions for assignment:', error);
    res.status(500).json({ error: 'Failed to delete questions.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const teacher = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'username', 'role', 'telegram_id', 'classId'],
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    
    // Format the response to match the frontend's expected format
    const profile = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      username: teacher.username,
      role: teacher.role,
      telegramId: teacher.telegram_id,
      classId: teacher.classId,
      className: teacher.class ? teacher.class.name : null
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const teacher = await User.findByPk(req.user.id);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    teacher.name = name || teacher.name;
    teacher.email = email || teacher.email;

    // Handle profile picture upload
    if (req.file) {
      // In a real app, you'd save this to a cloud storage (e.g., S3) and store the URL.
      // For this project, we'll store it as a base64 string or a path.
      teacher.profilePicture = `/uploads/${req.file.filename}`;
    }

    await teacher.save();
    res.json(teacher);
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

exports.createAnnouncement = async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.getAnnouncements = async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};
