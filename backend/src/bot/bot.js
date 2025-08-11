const { Question, Exam, Class, Subject, User } = require('../models');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Parse questions from text content
 * @param {string} text - The text content to parse
 * @returns {Array} Array of parsed question objects
 */
function parseQuestions(text) {
  // Split by lines starting with number dot (e.g., 1.)
  const lines = text.split(/\r?\n/);
  const questions = [];
  let current = '';
  
  for (const line of lines) {
    if (/^\d+\./.test(line.trim())) {
      if (current) questions.push(current.trim());
      current = line;
    } else {
      current += '\n' + line;
    }
  }
  if (current) questions.push(current.trim());

  return questions.map(q => {
    // Extract question number and text
    const match = q.match(/^(\d+)\.\s*(.+?)(?:\n|$)/s);
    if (!match) return null;
    
    const [_, number, questionText] = match;
    const options = [];
    const optionRegex = /^([A-D])[\.\)]\s*(.+)$/gmi;
    let optionMatch;
    
    while ((optionMatch = optionRegex.exec(q)) !== null) {
      const [_, letter, text] = optionMatch;
      options.push({ 
        id: letter.toUpperCase(),
        text: text.trim() 
      });
    }
    
    // Extract correct answer (assuming it's marked with Answer: X or (X) at the end)
    let correctAnswer = '';
    const answerMatch = q.match(/Answer:\s*([A-D])/i) || q.match(/\(([A-D])\)\s*$/i);
    if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase();
    } else if (options.length > 0) {
      // If no answer specified, default to first option
      correctAnswer = options[0].id;
    }
    
    return {
      number: parseInt(number, 10),
      text: questionText.trim(),
      options,
      correctAnswer,
      marks: 1 // Default marks
    };
  }).filter(Boolean);
}

/**
 * Parse answers from text content
 * @param {string} text - The text content to parse
 * @returns {Array} Array of parsed answer objects
 */
function parseAnswers(text) {
  const answers = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const match = line.match(/(\d+)\s*[:.)]\s*([A-D])/i);
    if (match) {
      const questionNumber = parseInt(match[1], 10);
      const answer = match[2].toUpperCase();
      answers.push({ questionNumber, answer });
    }
  }
  
  return answers;
}

/**
 * Process uploaded question file
 * @param {Object} file - The uploaded file object
 * @param {number} examId - The exam ID to associate questions with
 * @param {number} teacherId - The ID of the teacher uploading the questions
 * @returns {Promise<Object>} Result of the operation
 */
async function processQuestionFile(file, examId, teacherId) {
  try {
    // Verify teacher has access to this exam
    const exam = await Exam.findOne({
      where: { id: examId, createdBy: teacherId },
      include: [
        { model: Class, as: 'class' },
        { model: Subject, as: 'subject' },
        { model: User, as: 'teacher' }
      ]
    });

    if (!exam) {
      return { success: false, error: 'Exam not found or access denied' };
    }

    let text;
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (fileExt === '.docx') {
      // Convert DOCX to text
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (fileExt === '.txt') {
      // For TXT files
      text = file.buffer.toString('utf-8');
    } else {
      return { success: false, error: 'Unsupported file format. Please upload a .txt or .docx file.' };
    }
    
    // Parse questions from text
    const questions = parseQuestions(text);
    
    if (questions.length === 0) {
      return { success: false, error: 'No questions found in the document. Please check the format.' };
    }
    
    // Create questions in the database
    const createdQuestions = await Question.bulkCreate(
      questions.map(q => ({
        examId,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        createdBy: teacherId
      }))
    );
    
    // Update exam question count
    await exam.update({
      questionCount: await Question.count({ where: { examId } })
    });
    
    return {
      success: true,
      message: `Successfully added ${createdQuestions.length} questions to exam "${exam.title}"`,
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject?.name,
        class: exam.class?.name,
        questionCount: createdQuestions.length
      }
    };
    
  } catch (error) {
    console.error('Error processing question file:', error);
    return { 
      success: false, 
      error: 'An error occurred while processing the question file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

/**
 * Get questions for an exam
 * @param {number} examId - The exam ID
 * @param {number} teacherId - The teacher's user ID (for authorization)
 * @returns {Promise<Object>} Result with questions or error
 */
async function getExamQuestions(examId, teacherId) {
  try {
    const exam = await Exam.findOne({
      where: { id: examId, createdBy: teacherId },
      include: [
        { model: Question, as: 'questions', order: [['id', 'ASC']] }
      ]
    });

    if (!exam) {
      return { success: false, error: 'Exam not found or access denied' };
    }

    return {
      success: true,
      questions: exam.questions || [],
      exam: {
        id: exam.id,
        title: exam.title,
        questionCount: exam.questions?.length || 0
      }
    };
  } catch (error) {
    console.error('Error getting exam questions:', error);
    return { 
      success: false, 
      error: 'Failed to retrieve exam questions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

/**
 * Delete a question
 * @param {number} questionId - The question ID to delete
 * @param {number} teacherId - The teacher's user ID (for authorization)
 * @returns {Promise<Object>} Result of the operation
 */
async function deleteQuestion(questionId, teacherId) {
  try {
    const question = await Question.findOne({
      where: { id: questionId },
      include: [
        { 
          model: Exam, 
          as: 'exam',
          where: { createdBy: teacherId },
          required: true
        }
      ]
    });

    if (!question) {
      return { success: false, error: 'Question not found or access denied' };
    }

    await question.destroy();
    
    // Update exam question count
    await question.exam.update({
      questionCount: await Question.count({ where: { examId: question.examId } })
    });

    return { 
      success: true, 
      message: 'Question deleted successfully',
      examId: question.examId
    };
  } catch (error) {
    console.error('Error deleting question:', error);
    return { 
      success: false, 
      error: 'Failed to delete question',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

module.exports = {
  parseQuestions,
  parseAnswers,
  processQuestionFile,
  getExamQuestions,
  deleteQuestion
};
