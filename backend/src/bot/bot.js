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

function setupBot() {
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
      
      // Check if exam has been started
      if (selectedExam.startTime) {
        bot.sendMessage(msg.chat.id, `⚠️ Warning: This exam has already been started. Deleting it will remove all student progress and results. Are you sure you want to delete "${selectedExam.title}"?`, {
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
      } else {
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
      }
      return;
    }
    
    if (state.step === 'awaiting_delete_confirmation') {
      if (msg.text === 'Yes, delete it') {
        try {
          const { selectedExam } = state;
          
          // Check if there are any active sessions for this exam
          const activeSessions = await Session.count({ where: { ExamId: selectedExam.id } });
          
          if (activeSessions > 0) {
            bot.sendMessage(msg.chat.id, `⚠️ Warning: This exam has ${activeSessions} active student session(s). Deleting it will immediately terminate these sessions and lose all progress. Are you absolutely sure?`, {
              reply_markup: {
                keyboard: [['Yes, delete anyway'], ['No, cancel']],
                one_time_keyboard: true,
                resize_keyboard: true
              }
            });
            userStates[msg.from.id] = { 
              step: 'awaiting_final_delete_confirmation', 
              selectedExam,
              teacherId: state.teacherId 
            };
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
      userStates[msg.from.id].currentText = msg.text;
      userStates[msg.from.id].step = 'awaiting_options';
      bot.sendMessage(msg.chat.id, 'What are the options? (e.g. a.1 b.2 c.3 d.4)');
      return;
    }
    if (state.step === 'awaiting_options') {
      userStates[msg.from.id].currentOptions = msg.text;
      userStates[msg.from.id].step = 'awaiting_answer';
      bot.sendMessage(msg.chat.id, 'What is the correct answer? (a/b/c/d)');
      return;
    }
    if (state.step === 'awaiting_answer') {
      const answer = msg.text.trim().toLowerCase();
      if (!['a', 'b', 'c', 'd'].includes(answer)) {
        bot.sendMessage(msg.chat.id, 'Please enter a valid answer (a, b, c, or d).');
        return;
      }
      // Parse options
      const opts = {};
      const optMatch = userStates[msg.from.id].currentOptions.match(/a\.?\s*([^bcd]*)b\.?\s*([^cd]*)c\.?\s*([^d]*)d\.?\s*(.*)/i);
      if (optMatch) {
        opts.a = optMatch[1].trim();
        opts.b = optMatch[2].trim();
        opts.c = optMatch[3].trim();
        opts.d = optMatch[4].trim();
      } else {
        bot.sendMessage(msg.chat.id, 'Could not parse options. Please use the format: a.1 b.2 c.3 d.4');
        userStates[msg.from.id].step = 'awaiting_options';
        return;
      }
      userStates[msg.from.id].questions.push({
        number: userStates[msg.from.id].current,
        text: userStates[msg.from.id].currentText,
        options: opts,
        answer,
      });
      const next = userStates[msg.from.id].current + 1;
      if (next > userStates[msg.from.id].questionCount) {
        // Save to DB for selected assignment
        const { selected, questions } = userStates[msg.from.id];
        // Find or create the exam for this class/subject/teacher
        let exam = await Exam.findOne({
          where: {
            ClassId: selected.classId,
            subjectId: selected.subjectId,
            createdBy: selected.teacherId
          }
        });
        if (!exam) {
          exam = await Exam.create({
            ClassId: selected.classId,
            subjectId: selected.subjectId,
            createdBy: selected.teacherId,
            title: `Exam for ${selected.Class.name} - ${selected.Subject.name}`,
            status: 'draft'
          });
        }
        // Save each question
        for (const q of questions) {
          await Question.create({
            ExamId: exam.id,
            text: q.text,
            options: q.options,
            answer: q.answer,
            type: 'mcq'
          });
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