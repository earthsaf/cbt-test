const TelegramBot = require('node-telegram-bot-api');
const { User, TeacherClassSubject, Class, Subject, Exam, Question, Session } = require('../models');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
let bot;
// Conversation state for each user
const userStates = {};

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
      current += ' ' + line;
    }
  }
  if (current) questions.push(current.trim());
  // Parse options
  return questions.map(q => {
    const match = q.match(/^(\d+)\.(.*)$/s);
    if (!match) return null;
    const number = parseInt(match[1]);
    const rest = match[2].trim();
    // Find options a. b. c. d.
    const opts = {};
    const optMatch = rest.match(/a\.(.*?)b\.(.*?)c\.(.*?)d\.(.*)/s);
    if (optMatch) {
      opts.a = optMatch[1].trim();
      opts.b = optMatch[2].trim();
      opts.c = optMatch[3].trim();
      opts.d = optMatch[4].trim();
    }
    return { number, text: rest.replace(/a\..*/, '').trim(), options: opts };
  }).filter(Boolean);
}

function parseAnswers(text) {
  // Each line: 1.a, 2.b, ...
  const lines = text.split(/\r?\n/);
  const answers = {};
  for (const line of lines) {
    const match = line.match(/^(\d+)\.?([a-dA-D])$/);
    if (match) {
      answers[parseInt(match[1])] = match[2].toLowerCase();
    }
  }
  return answers;
}

function setupBot(io) {
  if (bot) return;
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  
  bot.onText(/\/start/, (msg) => {
    const welcomeMessage = `🎉 Welcome to the CBT System Bot!

This bot helps teachers manage exams and students take tests.

📚 Teachers can:
• Create exams with questions
• List and manage their exams
• Delete exams when needed

📝 Students can:
• Take exams through the web interface

Use /help for detailed instructions or /menu for quick access.`;
    
    bot.sendMessage(msg.chat.id, welcomeMessage);
  });

  bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Menu:\n/cbt exam - Take an exam\n/upload - Upload questions (teachers only)\n/list - List your exams (teachers only)\n/delete - Delete exam (teachers only)');
  });

  bot.onText(/\/help/, (msg) => {
    const helpMessage = `🤖 CBT System Bot Help

📚 For Teachers:
• /upload - Create a new exam with questions
• /list - View all your exams and their status
• /delete - Delete an exam (with confirmation)
• /menu - Show main menu

📝 For Students:
• /cbt exam - Take an exam via web interface

💡 Tips:
• Use /upload to create exams step by step
• Use /list to see all your exams before deleting
• Started exams can still be deleted but will lose student progress
• Each exam is linked to a specific class and subject

Need help? Contact your system administrator.`;
    
    bot.sendMessage(msg.chat.id, helpMessage);
  });

  bot.onText(/\/cbt (exam|test)/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Select class: (not implemented)');
  });

  bot.onText(/\/list/, async (msg) => {
    const teacherTelegramId = msg.from.id.toString();
    const teacher = await User.findOne({ where: { telegram_id: teacherTelegramId, role: 'teacher' } });
    if (!teacher) {
      bot.sendMessage(msg.chat.id, 'You are not registered as a teacher.');
      return;
    }
    
    // Get all exams created by this teacher
    const exams = await Exam.findAll({
      where: { createdBy: teacher.id },
      include: [
        { model: Class, attributes: ['name'] },
        { model: Subject, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    
    if (exams.length === 0) {
      bot.sendMessage(msg.chat.id, 'You have no exams yet. Use /upload to create your first exam.');
      return;
    }
    
    let message = '📚 Your Exams:\n\n';
    for (const exam of exams) {
      const status = exam.status || 'draft';
      const startTime = exam.startTime ? '✅ Started' : '⏳ Not Started';
      
      // Count questions for this exam
      const questionCount = await Question.count({ where: { ExamId: exam.id } });
      
      message += `📝 ${exam.title}\n`;
      message += `   📖 Class: ${exam.Class?.name || 'Unknown'}\n`;
      message += `   📚 Subject: ${exam.Subject?.name || 'Unknown'}\n`;
      message += `   📊 Status: ${status}\n`;
      message += `   ⏰ ${startTime}\n`;
      message += `   ❓ Questions: ${questionCount}\n\n`;
    }
    
    bot.sendMessage(msg.chat.id, message);
  });

  bot.onText(/\/upload/, async (msg) => {
    const teacherTelegramId = msg.from.id.toString();
    const teacher = await User.findOne({ where: { telegram_id: teacherTelegramId, role: 'teacher' } });
    if (!teacher) {
      bot.sendMessage(msg.chat.id, 'You are not registered as a teacher.');
      return;
    }
    const assignments = await TeacherClassSubject.findAll({
      where: { teacherId: teacher.id },
      include: [
        { model: Class, attributes: ['name'] },
        { model: Subject, attributes: ['name'] },
      ],
    });
    if (assignments.length === 0) {
      bot.sendMessage(msg.chat.id, 'You have no class/subject assignments.');
      return;
    }
    const options = assignments.map(a => `${a.Class.name} - ${a.Subject.name}`);
    userStates[msg.from.id] = { step: 'awaiting_assignment', assignments };
    bot.sendMessage(msg.chat.id, 'Choose a class and subject to upload questions to:', {
      reply_markup: {
        keyboard: options.map(o => [o]),
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });
  });

  bot.onText(/\/delete/, async (msg) => {
    const teacherTelegramId = msg.from.id.toString();
    const teacher = await User.findOne({ where: { telegram_id: teacherTelegramId, role: 'teacher' } });
    if (!teacher) {
      bot.sendMessage(msg.chat.id, 'You are not registered as a teacher.');
      return;
    }
    
    // Get all exams created by this teacher
    const exams = await Exam.findAll({
      where: { createdBy: teacher.id },
      include: [
        { model: Class, attributes: ['name'] },
        { model: Subject, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    
    if (exams.length === 0) {
      bot.sendMessage(msg.chat.id, 'You have no exams to delete.');
      return;
    }
    
    const examOptions = exams.map(exam => {
      const status = exam.status || 'draft';
      const startTime = exam.startTime ? ' (Started)' : ' (Not Started)';
      return `${exam.title} - ${exam.Class?.name || 'Unknown'} - ${exam.Subject?.name || 'Unknown'} - ${status}${startTime}`;
    });
    
    userStates[msg.from.id] = { 
      step: 'awaiting_exam_selection', 
      exams,
      teacherId: teacher.id 
    };
    
    bot.sendMessage(msg.chat.id, 'Choose an exam to delete:', {
      reply_markup: {
        keyboard: examOptions.map(o => [o]),
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });
  });

  bot.on('message', async (msg) => {
    const state = userStates[msg.from.id];
    if (!state) return;
    
    // Handle exam deletion
    if (state.step === 'awaiting_exam_selection') {
      const selectedExamText = msg.text;
      const selectedExam = state.exams.find(exam => {
        const status = exam.status || 'draft';
        const startTime = exam.startTime ? ' (Started)' : ' (Not Started)';
        const examText = `${exam.title} - ${exam.Class?.name || 'Unknown'} - ${exam.Subject?.name || 'Unknown'} - ${status}${startTime}`;
        return examText === selectedExamText;
      });
      
      if (!selectedExam) {
        bot.sendMessage(msg.chat.id, 'Invalid exam selection. Please try again.');
        return;
      }
      
      // Prevent deletion of started exams
      if (selectedExam.startTime) {
        bot.sendMessage(msg.chat.id, `❌ Cannot delete "${selectedExam.title}" because it has already been started.\n\nStarted exams cannot be deleted to maintain exam integrity.\n\nUse /list to view other exams you can manage.`);
        delete userStates[msg.from.id];
        return;
      }
      
      // For exams that haven't started, ask for confirmation
      bot.sendMessage(msg.chat.id, `Are you sure you want to delete "${selectedExam.title}"?`, {
        reply_markup: {
          keyboard: [['Yes, delete it'], ['No, cancel']],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
      userStates[msg.from.id] = { 
        step: 'awaiting_delete_confirmation', 
        selectedExam,
        teacherId: state.teacherId 
      };
      return;
    }
    
    if (state.step === 'awaiting_delete_confirmation') {
      if (msg.text === 'Yes, delete it') {
        try {
          const { selectedExam } = state;
          
          // Final check to ensure exam hasn't been started since selection
          const currentExamState = await Exam.findByPk(selectedExam.id);
          if (currentExamState.startTime) {
            bot.sendMessage(msg.chat.id, `❌ Cannot delete "${selectedExam.title}" because it has been started by another user.`);
            delete userStates[msg.from.id];
            return;
          }
          
          // Check if there are any active sessions (shouldn't happen for unstarted exams, but just in case)
          const activeSessions = await Session.count({ where: { ExamId: selectedExam.id } });
          if (activeSessions > 0) {
            bot.sendMessage(msg.chat.id, `❌ Cannot delete "${selectedExam.title}" because it has active student sessions.`);
            delete userStates[msg.from.id];
            return;
          }
          
          // Delete all questions associated with this exam
          await Question.destroy({ where: { ExamId: selectedExam.id } });
          
          // Delete any sessions associated with this exam
          await Session.destroy({ where: { ExamId: selectedExam.id } });
          
          // Delete the exam
          await selectedExam.destroy();
          
          bot.sendMessage(msg.chat.id, `✅ Exam "${selectedExam.title}" has been successfully deleted along with all its questions and sessions.`);
          delete userStates[msg.from.id];
        } catch (error) {
          console.error('Error deleting exam:', error);
          bot.sendMessage(msg.chat.id, '❌ An error occurred while deleting the exam. Please try again.');
          delete userStates[msg.from.id];
        }
      } else if (msg.text === 'No, cancel') {
        bot.sendMessage(msg.chat.id, '❌ Exam deletion cancelled.');
        delete userStates[msg.from.id];
      } else {
        bot.sendMessage(msg.chat.id, 'Please select "Yes, delete it" or "No, cancel".');
      }
      return;
    }
    
    if (state.step === 'awaiting_final_delete_confirmation') {
      bot.sendMessage(msg.chat.id, 'Invalid operation. Please try again.');
      delete userStates[msg.from.id];
      if (msg.text === 'Yes, delete anyway') {
        try {
          const { selectedExam } = state;
          
          // Delete all questions associated with this exam
          await Question.destroy({ where: { ExamId: selectedExam.id } });
          
          // Delete any sessions associated with this exam
          await Session.destroy({ where: { ExamId: selectedExam.id } });
          
          // Delete the exam
          await selectedExam.destroy();
          
          bot.sendMessage(msg.chat.id, `✅ Exam "${selectedExam.title}" has been forcefully deleted. All student sessions and progress have been lost.`);
          delete userStates[msg.from.id];
        } catch (error) {
          console.error('Error deleting exam:', error);
          bot.sendMessage(msg.chat.id, '❌ An error occurred while deleting the exam. Please try again.');
          delete userStates[msg.from.id];
        }
      } else if (msg.text === 'No, cancel') {
        bot.sendMessage(msg.chat.id, '❌ Exam deletion cancelled.');
        delete userStates[msg.from.id];
      } else {
        bot.sendMessage(msg.chat.id, 'Please select "Yes, delete anyway" or "No, cancel".');
      }
      return;
    }
    
    if (state.step === 'awaiting_assignment') {
      const selected = state.assignments.find(a => `${a.Class.name} - ${a.Subject.name}` === msg.text);
      if (!selected) return;
      userStates[msg.from.id] = {
        step: 'awaiting_question_count',
        selected,
      };
      bot.sendMessage(msg.chat.id, 'How many questions do you want to upload?', {
        reply_markup: {
          keyboard: [["20", "30", "40"], ["60", "80", "Custom"]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
      return;
    }
    if (state.step === 'awaiting_question_count') {
      if (msg.text === 'Custom') {
        userStates[msg.from.id].step = 'awaiting_custom_count';
        bot.sendMessage(msg.chat.id, 'Enter the number of questions (between 5 and 80):');
        return;
      }
      const count = parseInt(msg.text);
      if (![20, 30, 40, 60, 80].includes(count)) {
        bot.sendMessage(msg.chat.id, 'Please select a valid number of questions or choose Custom.');
        return;
      }
      userStates[msg.from.id] = {
        ...state,
        step: 'awaiting_question_text',
        questionCount: count,
        current: 1,
        questions: [],
      };
      bot.sendMessage(msg.chat.id, `What is question 1?`);
      return;
    }
    if (state.step === 'awaiting_custom_count') {
      const count = parseInt(msg.text);
      if (isNaN(count) || count < 5 || count > 80) {
        bot.sendMessage(msg.chat.id, 'Please enter a valid number between 5 and 80.');
        return;
      }
      userStates[msg.from.id] = {
        ...state,
        step: 'awaiting_question_text',
        questionCount: count,
        current: 1,
        questions: [],
      };
      bot.sendMessage(msg.chat.id, `What is question 1?`);
      return;
    }
    if (state.step === 'awaiting_question_text') {
      const questionText = msg.text.trim();
      if (!questionText) {
        bot.sendMessage(msg.chat.id, 'Question text cannot be empty. Please enter the question:');
        return;
      }
      userStates[msg.from.id].currentText = questionText;
      userStates[msg.from.id].step = 'awaiting_options';
      bot.sendMessage(msg.chat.id, 
        'Enter the options in this format (each option on a new line):\n' +
        'a. First option\n' +
        'b. Second option\n' +
        'c. Third option\n' +
        'd. Fourth option'
      );
      return;
    }
    if (state.step === 'awaiting_options') {
      const optionsText = msg.text.trim();
      const options = {};
      const optionLines = optionsText.split('\n').map(line => line.trim()).filter(Boolean);
      
      // Parse options from the message
      optionLines.forEach(line => {
        const match = line.match(/^([a-d])\.?\s*(.+)$/i);
        if (match) {
          const key = match[1].toLowerCase();
          options[key] = match[2].trim();
        }
      });
      
      // Validate we have exactly 4 options (a, b, c, d)
      const validOptions = ['a', 'b', 'c', 'd'];
      const missingOptions = validOptions.filter(opt => !options[opt]);
      
      if (missingOptions.length > 0) {
        bot.sendMessage(msg.chat.id, 
          `Please provide all 4 options (a, b, c, d). Missing: ${missingOptions.join(', ')}\n` +
          'Example format:\n' +
          'a. First option\n' +
          'b. Second option\n' +
          'c. Third option\n' +
          'd. Fourth option'
        );
        return;
      }
      
      userStates[msg.from.id].currentOptions = options;
      userStates[msg.from.id].step = 'awaiting_answer';
      
      // Show the question and options for confirmation
      const questionPreview = `*Question ${userStates[msg.from.id].current}:* ${userStates[msg.from.id].currentText}\n\n` +
        'Options:\n' +
        Object.entries(options)
          .map(([key, value]) => `${key.toUpperCase()}. ${value}`)
          .join('\n') +
        '\n\nPlease enter the correct answer (a, b, c, or d):';
      
      bot.sendMessage(msg.chat.id, questionPreview, { parse_mode: 'Markdown' });
      return;
    }
    if (state.step === 'awaiting_answer') {
      const answer = msg.text.trim().toLowerCase();
      if (!['a', 'b', 'c', 'd'].includes(answer)) {
        bot.sendMessage(msg.chat.id, '❌ Invalid answer. Please enter a, b, c, or d.');
        return;
      }
      
      // Add the question to our list
      userStates[msg.from.id].questions.push({
        number: userStates[msg.from.id].current,
        text: userStates[msg.from.id].currentText,
        options: userStates[msg.from.id].currentOptions,
        answer,
      });
      
      // Show confirmation of the added question
      const currentQuestion = userStates[msg.from.id].current;
      const totalQuestions = userStates[msg.from.id].questionCount;
      
      if (currentQuestion < totalQuestions) {
        bot.sendMessage(msg.chat.id, `✅ Question ${currentQuestion} saved!`);
      }
      const next = userStates[msg.from.id].current + 1;
      if (next > userStates[msg.from.id].questionCount) {
        // Save to DB for selected assignment
        const { selected, questions } = userStates[msg.from.id];
        
        try {
          // Start a transaction to ensure all or nothing is saved
          const transaction = await db.sequelize.transaction();
          
          try {
            // Find or create the exam for this class/subject/teacher
            const [exam, created] = await Exam.findOrCreate({
              where: {
                ClassId: selected.classId,
                subjectId: selected.subjectId,
                createdBy: selected.teacherId,
                status: 'draft' // Only find draft exams
              },
              defaults: {
                title: `Exam for ${selected.Class.name} - ${selected.Subject.name}`,
                status: 'draft',
                startTime: null,
                endTime: null
              },
              transaction
            });
            
            // If we found an existing exam, clear its questions first
            if (!created) {
              await Question.destroy({
                where: { ExamId: exam.id },
                transaction
              });
            }
            
            // Save each question
            for (const q of questions) {
              await Question.create({
                ExamId: exam.id,
                text: q.text,
                options: q.options,
                answer: q.answer,
                type: 'mcq',
                marks: 1 // Default to 1 mark per question
              }, { transaction });
            }
            
            // Commit the transaction
            await transaction.commit();
            
            // Send success message with exam details
            const examDetails = `*Exam Details*\n` +
              `*Class:* ${selected.Class.name}\n` +
              `*Subject:* ${selected.Subject.name}\n` +
              `*Questions:* ${questions.length}\n` +
              `*Status:* Draft\n\n` +
              `You can now start this exam from the admin panel.`;
              
            bot.sendMessage(msg.chat.id, `✅ *Upload Successful!*\n\n${examDetails}`, { parse_mode: 'Markdown' });
            
          } catch (error) {
            // If anything fails, rollback the transaction
            await transaction.rollback();
            throw error; // Re-throw to be caught by the outer try-catch
          }
          
        } catch (error) {
          console.error('Error saving exam:', error);
          bot.sendMessage(msg.chat.id, '❌ An error occurred while saving the exam. Please try again.');
          return;
        }
        bot.sendMessage(msg.chat.id, `Upload successful! ${questions.length} questions saved for ${selected.Class.name} - ${selected.Subject.name}.`);
        delete userStates[msg.from.id];
        return;
      } else {
        userStates[msg.from.id].current = next;
        userStates[msg.from.id].step = 'awaiting_question_text';
        bot.sendMessage(msg.chat.id, `What is question ${next}?`);
        return;
      }
    }
  });
  // Add more handlers as needed
}
module.exports = { setupBot }; 