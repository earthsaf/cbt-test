const { TeacherClassSubject, Class, Subject, User, Exam, Question, Announcement } = require('../models');
const { Op, Sequelize, QueryTypes } = require('sequelize');

// Maximum number of questions to process in a single batch
const MAX_BATCH_SIZE = 500;

/**
 * Get all class and subject assignments for the current teacher
 */
exports.getAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    console.log(`Fetching assignments for teacher: ${teacherId}`);

    // Try to find assignments using the new UUID field first
    const assignments = await TeacherClassSubject.findAll({
      where: {
        [Op.or]: [
          { teacherIdNew: teacherId },
          { teacherId: teacherId } // Fallback to legacy ID if needed
        ]
      },
      include: [
        { 
          model: Class, 
          as: 'class',
          attributes: ['id', 'name'],
          required: false 
        },
        { 
          model: Subject, 
          as: 'subject',
          attributes: ['id', 'name'],
          required: false 
        },
      ],
      attributes: {
        include: [
          // Use the new UUID field if available, otherwise fall back to the legacy ID
          [
            Sequelize.fn('COALESCE', 
              Sequelize.col('teacherIdNew'),
              Sequelize.col('teacherId')
            ),
            'teacherId'
          ]
        ]
      },
      raw: false
    });

    if (!assignments || assignments.length === 0) {
      console.warn(`No assignments found for teacher: ${teacherId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No class or subject assignments found for this teacher' 
      });
    }

    // Format the response to ensure consistent field names
    const formattedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      teacherId: assignment.teacherIdNew || assignment.teacherId,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      class: assignment.class ? {
        id: assignment.class.id,
        name: assignment.class.name
      } : null,
      subject: assignment.subject ? {
        id: assignment.subject.id,
        name: assignment.subject.name
      } : null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    }));

    res.json({
      success: true,
      data: formattedAssignments
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch teacher assignments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all students in a specific class that the teacher is assigned to
 */
exports.getStudentsByClass = async (req, res) => {
  const { classId } = req.params;
  const teacherId = req.user.id;

  if (!classId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Class ID is required' 
    });
  }

  try {
    console.log(`Fetching students for class ${classId} by teacher ${teacherId}`);

    // Verify the teacher is assigned to this class (using either new or legacy ID)
    const assignment = await TeacherClassSubject.findOne({
      where: {
        classId,
        [Op.or]: [
          { teacherIdNew: teacherId },
          { teacherId: teacherId }
        ]
      },
      attributes: ['id']
    });

    if (!assignment) {
      console.warn(`Teacher ${teacherId} not authorized to view class ${classId}`);
      return res.status(403).json({ 
        success: false,
        error: 'You are not authorized to view students in this class.' 
      });
    }

    const students = await User.findAll({
      where: { 
        classId: classId, 
        role: 'student' 
      },
      attributes: [
        'id', 
        'username', 
        'name', 
        'email',
        'createdAt',
        'updatedAt'
      ],
      order: [['name', 'ASC']],
      raw: true
    });

    if (!students || students.length === 0) {
      console.log(`No students found in class ${classId}`);
      return res.status(404).json({
        success: true,
        data: [],
        message: 'No students found in this class.'
      });
    }

    // Format the response to ensure consistent field names
    const formattedStudents = students.map(student => ({
      id: student.id,
      username: student.username,
      name: student.name,
      email: student.email,
      joinedAt: student.createdAt,
      lastActive: student.updatedAt
    }));

    res.json({
      success: true,
      data: formattedStudents,
      count: formattedStudents.length
    });
  } catch (error) {
    console.error(`Error fetching students for class ${classId}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch students',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new exam for a class and subject the teacher is assigned to
 */
exports.createExam = async (req, res) => {
  const { title, classId, subjectId, status, description, duration, totalMarks } = req.body;
  const teacherId = req.user.id;

  // Validate required fields
  const requiredFields = ['title', 'classId', 'subjectId', 'status'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Validate status is one of the allowed values
  const validStatuses = ['draft', 'scheduled', 'active', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const t = await Exam.sequelize.transaction();
  
  try {
    console.log(`Creating exam for class ${classId}, subject ${subjectId} by teacher ${teacherId}`);

    // Verify the teacher is assigned to this class and subject (using either new or legacy ID)
    const assignment = await TeacherClassSubject.findOne({
      where: {
        classId,
        subjectId,
        [Op.or]: [
          { teacherIdNew: teacherId },
          { teacherId: teacherId }
        ]
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!assignment) {
      console.warn(`Teacher ${teacherId} not authorized to create exam for class ${classId}, subject ${subjectId}`);
      await t.rollback();
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to create an exam for this class and subject.'
      });
    }

    // Check if an exam with the same title already exists for this class and subject
    const existingExam = await Exam.findOne({
      where: {
        title,
        classId,
        subjectId,
        createdBy: teacherId
      },
      transaction: t
    });

    if (existingExam) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        error: 'An exam with this title already exists for the selected class and subject.'
      });
    }

    // Create the exam within the transaction
    const exam = await Exam.create({
      title,
      description: description || null,
      classId,
      subjectId,
      status,
      duration: duration || null,
      totalMarks: totalMarks || null,
      createdBy: teacherId,
      updatedBy: teacherId
    }, { transaction: t });

    // If we got here, commit the transaction
    await t.commit();
    
    console.log(`Created exam ${exam.id} successfully`);
    
    res.status(201).json({
      success: true,
      data: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        classId: exam.classId,
        subjectId: exam.subjectId,
        status: exam.status,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt
      },
      message: 'Exam created successfully'
    });
  } catch (error) {
    // If we reach here, rollback the transaction
    await t.rollback();
    
    console.error('Error creating exam:', error);
    
    // Handle specific error types
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create exam',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload multiple questions for an exam in a batch
 * Supports both creating new questions and updating existing ones
 */
exports.uploadQuestions = async (req, res) => {
  const { assignmentId, questions, examId } = req.body;
  const teacherId = req.user.id;

  // Validate required fields
  if (!assignmentId) {
    return res.status(400).json({
      success: false,
      error: 'Assignment ID is required'
    });
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Questions array is required and must not be empty'
    });
  }

  // Limit batch size to prevent abuse/overload
  const MAX_BATCH_SIZE = 100;
  if (questions.length > MAX_BATCH_SIZE) {
    return res.status(413).json({
      success: false,
      error: `Batch size too large. Maximum ${MAX_BATCH_SIZE} questions per request.`
    });
  }

  const t = await Question.sequelize.transaction();
  
  try {
    console.log(`Processing ${questions.length} questions for assignment ${assignmentId} by teacher ${teacherId}`);

    // Verify the teacher is assigned to this class and subject (using either new or legacy ID)
    const assignment = await TeacherClassSubject.findOne({
      where: {
        id: assignmentId,
        [Op.or]: [
          { teacherIdNew: teacherId },
          { teacherId: teacherId }
        ]
      },
      attributes: ['id', 'classId', 'subjectId'],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!assignment) {
      await t.rollback();
      console.warn(`Teacher ${teacherId} not authorized to upload questions for assignment ${assignmentId}`);
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to upload questions for this assignment.'
      });
    }

    // Find the target exam
    let exam;
    if (examId) {
      // Use the specified exam if provided
      exam = await Exam.findOne({
        where: {
          id: examId,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          createdBy: teacherId
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!exam) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Exam not found or you do not have permission to modify it.'
        });
      }
    } else {
      // Otherwise, create a new exam
      exam = await Exam.create({
        title: `Exam - ${new Date().toLocaleDateString()}`,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        status: 'draft',
        createdBy: teacherId,
        updatedBy: teacherId
      }, { transaction: t });
      
      console.log(`Created new exam ${exam.id} for assignment ${assignmentId}`);
    }

    // Validate and prepare questions
    const now = new Date();
    const questionsToCreate = [];
    const questionsToUpdate = [];
    const errors = [];

    questions.forEach((q, index) => {
      // Basic validation
      if (!q.questionText || !q.questionType) {
        errors.push(`Question at index ${index}: Missing required fields (questionText and questionType are required)`);
        return;
      }

      // For MCQ questions, validate options and correctAnswer
      if (q.questionType === 'mcq') {
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`Question at index ${index}: MCQ questions must have at least 2 options`);
          return;
        }
        
        if (q.correctAnswer === undefined || q.correctAnswer === null) {
          errors.push(`Question at index ${index}: Correct answer is required for MCQ questions`);
          return;
        }
      }

      // For open-ended questions, ensure they have marks
      if (q.questionType === 'open_ended' && (q.marks === undefined || q.marks === null)) {
        errors.push(`Question at index ${index}: Marks are required for open-ended questions`);
        return;
      }

      const questionData = {
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        marks: q.marks || 1,
        difficulty: q.difficulty || 'medium',
        category: q.category || 'General',
        examId: exam.id,
        createdBy: teacherId,
        updatedBy: teacherId,
        createdAt: now,
        updatedAt: now
      };

      // If question has an ID, it's an update, otherwise it's a new question
      if (q.id) {
        questionsToUpdate.push({
          ...questionData,
          id: q.id
        });
      } else {
        questionsToCreate.push(questionData);
      }
    });

    // If there were validation errors, return them
    if (errors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Validation errors in questions',
        details: errors
      });
    }

    // Process updates and creates in parallel for better performance
    const [createdQuestions, updatedQuestions] = await Promise.all([
      // Create new questions
      questionsToCreate.length > 0 
        ? Question.bulkCreate(questionsToCreate, { transaction: t })
        : Promise.resolve([]),
      
      // Update existing questions
      questionsToUpdate.length > 0
        ? Promise.all(questionsToUpdate.map(q => 
            Question.update(q, { 
              where: { id: q.id, examId: exam.id },
              transaction: t 
            })))
        : Promise.resolve([])
    ]);

    // If we got here, commit the transaction
    await t.commit();

    console.log(`Successfully processed ${questionsToCreate.length} new and ${questionsToUpdate.length} updated questions for exam ${exam.id}`);
    
    res.status(201).json({
      success: true,
      data: {
        examId: exam.id,
        created: createdQuestions.length,
        updated: updatedQuestions.length,
        total: createdQuestions.length + updatedQuestions.length
      },
      message: 'Questions processed successfully'
    });
  } catch (error) {
    // If we reach here, rollback the transaction
    await t.rollback();
    
    console.error('Error uploading questions:', error);
    
    // Handle specific error types
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors ? error.errors.map(e => e.message) : [error.message]
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process questions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update an existing question
 */
exports.updateQuestion = async (req, res) => {
  const { questionId } = req.params;
  const teacherId = req.user.id;
  const updates = req.body;

  if (!questionId) {
    return res.status(400).json({
      success: false,
      error: 'Question ID is required'
    });
  }

  // Validate updates object
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No update data provided'
    });
  }

  const t = await Question.sequelize.transaction();
  
  try {
    console.log(`Updating question ${questionId} by teacher ${teacherId}`);

    // Find the question with its exam and verify teacher ownership
    const question = await Question.findOne({
      where: { id: questionId },
      include: [{
        model: Exam,
        as: 'exam',
        required: true,
        include: [{
          model: TeacherClassSubject,
          as: 'assignment',
          required: true,
          where: {
            [Op.or]: [
              { teacherIdNew: teacherId },
              { teacherId: teacherId }
            ]
          },
          attributes: [] // We don't need any attributes from the join table
        }]
      }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!question) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Question not found or you do not have permission to edit it.'
      });
    }

    // Validate question updates
    if (updates.questionType === 'mcq') {
      if (!updates.options || !Array.isArray(updates.options) || updates.options.length < 2) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'MCQ questions must have at least 2 options'
        });
      }
      
      if (updates.correctAnswer === undefined || updates.correctAnswer === null) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Correct answer is required for MCQ questions'
        });
      }
    }

    // For open-ended questions, ensure they have marks
    if ((updates.questionType === 'open_ended' || question.questionType === 'open_ended') && 
        (updates.marks === undefined || updates.marks === null)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Marks are required for open-ended questions'
      });
    }

    // Update the question
    const [affectedRows] = await Question.update(
      { 
        ...updates,
        updatedBy: teacherId,
        updatedAt: new Date()
      },
      { 
        where: { id: questionId },
        transaction: t
      }
    );

    if (affectedRows === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Question not found or no changes made'
      });
    }

    // Fetch the updated question
    const updatedQuestion = await Question.findByPk(questionId, { transaction: t });
    
    // Commit the transaction
    await t.commit();
    
    console.log(`Successfully updated question ${questionId}`);
    
    res.json({
      success: true,
      data: updatedQuestion,
      message: 'Question updated successfully'
    });
  } catch (error) {
    // If we reach here, rollback the transaction
    await t.rollback();
    
    console.error(`Error updating question ${questionId}:`, error);
    
    // Handle specific error types
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors ? error.errors.map(e => e.message) : [error.message]
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update question',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a question
 */
exports.deleteQuestion = async (req, res) => {
  const { questionId } = req.params;
  const teacherId = req.user.id;

  if (!questionId) {
    return res.status(400).json({
      success: false,
      error: 'Question ID is required'
    });
  }

  const t = await Question.sequelize.transaction();
  
  try {
    console.log(`Deleting question ${questionId} by teacher ${teacherId}`);

    // Find the question with its exam and verify teacher ownership
    const question = await Question.findOne({
      where: { id: questionId },
      include: [{
        model: Exam,
        as: 'exam',
        required: true,
        include: [{
          model: TeacherClassSubject,
          as: 'assignment',
          required: true,
          where: {
            [Op.or]: [
              { teacherIdNew: teacherId },
              { teacherId: teacherId }
            ]
          },
          attributes: [] // We don't need any attributes from the join table
        }]
      }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!question) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Question not found or you do not have permission to delete it.'
      });
    }

    // Check if the question is part of any active exam that's already started
    const activeExam = await Exam.findOne({
      where: {
        id: question.examId,
        status: {
          [Op.in]: ['active', 'in_progress']
        }
      },
      transaction: t
    });

    if (activeExam) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete questions from an active or in-progress exam.'
      });
    }

    // Soft delete the question
    const deletedCount = await Question.destroy({
      where: { id: questionId },
      transaction: t
    });

    if (deletedCount === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Question not found or already deleted'
      });
    }

    // Commit the transaction
    await t.commit();
    
    console.log(`Successfully deleted question ${questionId}`);
    
    res.json({
      success: true,
      message: 'Question deleted successfully',
      data: {
        questionId,
        examId: question.examId
      }
    });
  } catch (error) {
    // If we reach here, rollback the transaction
    await t.rollback();
    
    console.error(`Error deleting question ${questionId}:`, error);
    
    // Handle specific error types
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete question as it is referenced by other records.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete question',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

/**
 * Get all questions for an exam in a class/subject the teacher is assigned to
 */
exports.getQuestions = async (req, res) => {
  const { assignmentId } = req.params;
  const teacherId = req.user.id;

  if (!assignmentId) {
    return res.status(400).json({
      success: false,
      error: 'Assignment ID is required'
    });
  }

  const t = await Question.sequelize.transaction();
  
  try {
    console.log(`Fetching questions for assignment ${assignmentId} by teacher ${teacherId}`);

    // Verify the teacher is assigned to this class and subject (using either new or legacy ID)
    const assignment = await TeacherClassSubject.findOne({
      where: {
        id: assignmentId,
        [Op.or]: [
          { teacherIdNew: teacherId },
          { teacherId: teacherId }
        ]
      },
      attributes: ['id', 'classId', 'subjectId'],
      transaction: t,
      lock: t.LOCK.SHARE
    });

    if (!assignment) {
      await t.rollback();
      console.warn(`Teacher ${teacherId} not authorized to view assignment ${assignmentId}`);
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view questions for this assignment.'
      });
    }

    // Find the most recent exam for this assignment
    const exam = await Exam.findOne({
      where: {
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        createdBy: teacherId
      },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    if (!exam) {
      await t.rollback();
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No exam found for this assignment.'
      });
    }

    // Get all questions for this exam
    const questions = await Question.findAll({
      where: { examId: exam.id },
      attributes: [
        'id',
        'questionText',
        'options',
        'correctAnswer',
        'marks',
        'questionType',
        'difficulty',
        'category',
        'createdAt',
        'updatedAt'
      ],
      order: [['createdAt', 'ASC']],
      transaction: t
    });

    // Format the response
    const formattedQuestions = questions.map(question => ({
      id: question.id,
      examId: question.examId,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      marks: question.marks,
      questionType: question.questionType,
      difficulty: question.difficulty,
      category: question.category,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    }));

    // Commit the transaction
    await t.commit();

    res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          title: exam.title,
          status: exam.status,
          totalMarks: exam.totalMarks,
          questionCount: formattedQuestions.length
        },
        questions: formattedQuestions
      },
      count: formattedQuestions.length
    });
  } catch (error) {
    // If we reach here, rollback the transaction
    await t.rollback();
    
    console.error(`Error fetching questions for assignment ${assignmentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all exams for classes and subjects the teacher is assigned to
 * Supports filtering, sorting, and pagination
 */
exports.getExams = async (req, res) => {
  const teacherId = req.user.id;
  
  // Parse query parameters with defaults
  const {
    page = 1,
    pageSize = 10,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    status,
    classId,
    subjectId,
    searchTerm
  } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);
  
  // Validate pagination parameters
  if (isNaN(offset) || isNaN(limit) || offset < 0 || limit < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pagination parameters'
    });
  }
  
  // Validate sort order
  const validSortOrders = ['ASC', 'DESC'];
  if (!validSortOrders.includes(sortOrder.toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sort order. Must be one of: ' + validSortOrders.join(', ')
    });
  }
  
  // Validate sort field
  const validSortFields = ['title', 'status', 'createdAt', 'updatedAt', 'startDate', 'endDate'];
  if (!validSortFields.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sort field. Must be one of: ' + validSortFields.join(', ')
    });
  }

  const t = await Exam.sequelize.transaction();
  
  try {
    console.log(`Fetching exams for teacher ${teacherId} with filters:`, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      status,
      classId,
      subjectId,
      searchTerm
    });

    // Build the base query for teacher's assignments
    const assignmentWhere = {
      [Op.or]: [
        { teacherIdNew: teacherId },
        { teacherId: teacherId }
      ]
    };
    
    // Add filters if provided
    if (classId) assignmentWhere.classId = classId;
    if (subjectId) assignmentWhere.subjectId = subjectId;

    // Get all class-subject assignments for this teacher
    const assignments = await TeacherClassSubject.findAll({
      where: assignmentWhere,
      attributes: ['classId', 'subjectId'],
      transaction: t,
      lock: t.LOCK.SHARE
    });

    if (assignments.length === 0) {
      await t.rollback();
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          totalItems: 0,
          totalPages: 0
        }
      });
    }

    // Build the exam query
    const examWhere = {
      [Op.or]: assignments.map(assignment => ({
        classId: assignment.classId,
        subjectId: assignment.subjectId
      })),
      createdBy: teacherId
    };
    
    // Add status filter if provided
    if (status) {
      examWhere.status = Array.isArray(status) ? { [Op.in]: status } : status;
    }
    
    // Add search term filter if provided
    if (searchTerm) {
      examWhere[Op.or] = [
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    // Get total count for pagination
    const totalItems = await Exam.count({
      where: examWhere,
      transaction: t
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated exams with related data
    const exams = await Exam.findAll({
      where: examWhere,
      include: [
        { 
          model: Class, 
          as: 'class',
          attributes: ['id', 'name', 'level']
        },
        { 
          model: Subject, 
          as: 'subject',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Question,
          as: 'questions',
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id',
        'title',
        'description',
        'status',
        'duration',
        'totalMarks',
        'startDate',
        'endDate',
        'createdAt',
        'updatedAt',
        [Sequelize.fn('COUNT', Sequelize.col('questions.id')), 'questionCount']
      ],
      group: ['Exam.id', 'class.id', 'subject.id'],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      transaction: t,
      subQuery: false,
      raw: false
    });
    
    // Format the response
    const formattedExams = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      startDate: exam.startDate,
      endDate: exam.endDate,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      class: exam.class ? {
        id: exam.class.id,
        name: exam.class.name,
        level: exam.class.level
      } : null,
      subject: exam.subject ? {
        id: exam.subject.id,
        name: exam.subject.name,
        code: exam.subject.code
      } : null,
      questionCount: exam.questions ? exam.questions.length : 0
    }));
    
    // Commit the transaction
    await t.commit();
    
    res.json({
      success: true,
      data: formattedExams,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    // If we reach here, rollback the transaction
    await t.rollback();
    
    console.error('Error fetching exams:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exams',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
