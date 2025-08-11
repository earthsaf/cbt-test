const TelegramBot = require('node-telegram-bot-api');
const { User, Subject, Question, Exam } = require('../models');

// Conversation states
const states = {
  IDLE: 'IDLE',
  AWAITING_SUBJECT: 'AWAITING_SUBJECT',
  AWAITING_QUESTION_COUNT: 'AWAITING_QUESTION_COUNT',
  AWAITING_CUSTOM_COUNT: 'AWAITING_CUSTOM_COUNT',
  AWAITING_QUESTION: 'AWAITING_QUESTION',
  AWAITING_OPTIONS: 'AWAITING_OPTIONS',
  AWAITING_ANSWER: 'AWAITING_ANSWER',
  CONFIRM_QUESTION: 'CONFIRM_QUESTION'
};

const userSessions = new Map();

class TelegramBotService {
  constructor(token) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/upload/, this.handleUpload.bind(this));
    this.bot.onText(/\/list/, this.handleList.bind(this));
    this.bot.onText(/\/delete/, this.handleDelete.bind(this));
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
    this.bot.on('message', this.handleMessage.bind(this));
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    
    try {
      const user = await User.findOne({ 
        where: { telegramId, role: 'teacher' },
        include: [{ model: Subject, as: 'subjects' }]
      });

      if (!user) {
        return this.bot.sendMessage(chatId, '❌ You are not registered as a teacher.');
      }

      userSessions.set(chatId, {
        state: states.IDLE,
        user: { id: user.id, telegramId, subjects: user.subjects },
        tempData: {}
      });

      const welcomeMsg = `👋 Welcome, ${user.name || 'Teacher'}!\n\n` +
        'Commands:\n' +
        '/upload - Add a question\n' +
        '/list - List your questions\n' +
        '/delete - Delete a question';

      this.bot.sendMessage(chatId, welcomeMsg);
    } catch (error) {
      console.error('Start error:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
  }

  async handleUpload(msg) {
    const chatId = msg.chat.id;
    const session = userSessions.get(chatId);
    
    if (!session || !session.user) {
      return this.bot.sendMessage(chatId, 'Please /start first.');
    }

    if (!session.user.subjects?.length) {
      return this.bot.sendMessage(chatId, '❌ No subjects assigned to you yet. Please contact an administrator.');
    }

    // Create subject buttons
    const subjectButtons = session.user.subjects.map(subject => ({
      text: subject.name,
      callback_data: `subject_${subject.id}`
    }));

    const keyboard = {
      inline_keyboard: [
        ...subjectButtons.map(btn => [btn]),
        [{ text: '❌ Cancel', callback_data: 'cancel_upload' }]
      ]
    };

    session.state = states.AWAITING_SUBJECT;
    session.tempData = { questions: [] }; // Initialize questions array
    userSessions.set(chatId, session);
    
    this.bot.sendMessage(chatId, '📚 Select a subject to add questions to:', {
      reply_markup: keyboard
    });
  }

  async handleList(msg) {
    const chatId = msg.chat.id;
    const session = userSessions.get(chatId);
    
    if (!session) return this.bot.sendMessage(chatId, 'Please /start first.');

    try {
      const questions = await Question.findAll({
        where: { createdBy: session.user.id },
        include: [{
          model: Exam,
          include: [Subject]
        }],
        limit: 10,
        order: [['createdAt', 'DESC']]
      });

      if (!questions.length) {
        return this.bot.sendMessage(chatId, 'No questions found.');
      }

      let message = '📋 Your questions:\n\n';
      questions.forEach((q, i) => {
        message += `${i+1}. ${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}\n`;
        message += `   Subject: ${q.Exam.Subject.name} | ID: ${q.id}\n\n`;
      });

      this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('List error:', error);
      this.bot.sendMessage(chatId, '❌ Failed to list questions.');
    }
  }

  async handleDelete(msg) {
    const chatId = msg.chat.id;
    const session = userSessions.get(chatId);
    
    if (!session) return this.bot.sendMessage(chatId, 'Please /start first.');

    try {
      const questions = await Question.findAll({
        where: { createdBy: session.user.id },
        limit: 5,
        order: [['createdAt', 'DESC']]
      });

      if (!questions.length) {
        return this.bot.sendMessage(chatId, 'No questions to delete.');
      }

      const keyboard = {
        inline_keyboard: questions.map(q => [
          { 
            text: `${q.text.substring(0, 30)}...`,
            callback_data: `delete_${q.id}`
          }
        ])
      };

      session.state = 'AWAITING_DELETE';
      userSessions.set(chatId, session);

      this.bot.sendMessage(chatId, 'Select question to delete:', { reply_markup: keyboard });
    } catch (error) {
      console.error('Delete error:', error);
      this.bot.sendMessage(chatId, '❌ Failed to process delete.');
    }
  }

  // Start a new question entry
  async startQuestionEntry(chatId, messageId, session) {
    const questionNumber = session.tempData.currentQuestion;
    const totalQuestions = session.tempData.totalQuestions;
    
    session.state = states.AWAITING_QUESTION;
    session.tempData.currentQuestionData = {
      options: []
    };
    userSessions.set(chatId, session);
    
    await this.bot.editMessageText(
      `📝 Question ${questionNumber} of ${totalQuestions}\n\n` +
      'Please enter the question text:',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'cancel_question' }]
          ]
        }
      }
    );
  }
  
  // Save the current question to the database
  async saveQuestion(session, chatId) {
    const { questionText, options, correctOption } = session.tempData.currentQuestionData;
    
    try {
      // Find or create an exam for this subject
      const [exam] = await Exam.findOrCreate({
        where: { 
          subjectId: session.tempData.subjectId,
          classId: session.user.classId
        },
        defaults: {
          title: `${session.tempData.subjectName} Exam`,
          description: `Auto-generated exam for ${session.tempData.subjectName}`,
          duration: 60, // Default duration in minutes
          startTime: new Date(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          totalMarks: 100,
          passingMarks: 40,
          isActive: true,
          createdBy: session.user.id
        }
      });
      
      // Create the question
      await Question.create({
        examId: exam.id,
        text: questionText,
        options: options.map((opt, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, ...
          text: opt,
          isCorrect: index === correctOption
        })),
        correctAnswer: String.fromCharCode(65 + correctOption),
        marks: 1, // Default marks per question
        createdBy: session.user.id
      });
      
      // Update exam question count
      await exam.increment('questionCount');
      
      // Add to session's questions array
      if (!session.tempData.questions) {
        session.tempData.questions = [];
      }
      session.tempData.questions.push({
        text: questionText,
        options: options.map((opt, index) => ({
          id: String.fromCharCode(65 + index),
          text: opt,
          isCorrect: index === correctOption
        })),
        correctAnswer: String.fromCharCode(65 + correctOption)
      });
      
      return true;
    } catch (error) {
      console.error('Error saving question:', error);
      return false;
    }
  }
  
  // Show confirmation for the current question
  async showQuestionConfirmation(chatId, messageId, session) {
    const { questionText, options, correctOption } = session.tempData.currentQuestionData;
    
    let message = `📝 *Question ${session.tempData.currentQuestion} of ${session.tempData.totalQuestions}*\n\n`;
    message += `*Question:* ${questionText}\n\n`;
    message += '*Options:*\n';
    
    options.forEach((opt, index) => {
      const prefix = index === correctOption ? '✅ ' : '• ';
      message += `${prefix}${String.fromCharCode(65 + index)}. ${opt}\n`;
    });
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '👍 Save Question', callback_data: 'confirm_question' }],
        [{ text: '✏️ Edit Question', callback_data: 'edit_question' }],
        [{ text: '❌ Cancel', callback_data: 'cancel_question' }]
      ]
    };
    
    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const session = userSessions.get(chatId);

    if (!session) {
      return this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Session expired. /start again.' });
    }

    try {
      // Handle subject selection
      if (data.startsWith('subject_') && session.state === states.AWAITING_SUBJECT) {
        const subjectId = parseInt(data.split('_')[1]);
        const subject = session.user.subjects.find(s => s.id === subjectId);
        
        if (!subject) {
          return this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Invalid subject selected.' });
        }

        // Store selected subject
        session.tempData.subjectId = subject.id;
        session.tempData.subjectName = subject.name;
        session.state = states.AWAITING_QUESTION_COUNT;
        userSessions.set(chatId, session);

        // Show question count options
        const keyboard = {
          inline_keyboard: [
            [{ text: '20 Questions', callback_data: 'count_20' }],
            [{ text: '40 Questions', callback_data: 'count_40' }],
            [{ text: '60 Questions', callback_data: 'count_60' }],
            [{ text: 'Custom Number', callback_data: 'count_custom' }],
            [{ text: '❌ Cancel', callback_data: 'cancel_upload' }]
          ]
        };

        await this.bot.editMessageText(
          `📝 You selected: ${subject.name}\n\nHow many questions would you like to add?`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
          }
        );
      }
      // Handle question count selection
      else if (data.startsWith('count_') && session.state === states.AWAITING_QUESTION_COUNT) {
        const countType = data.split('_')[1];
        
        if (countType === 'custom') {
          session.state = states.AWAITING_CUSTOM_COUNT;
          userSessions.set(chatId, session);
          
          await this.bot.editMessageText(
            '🔢 Please enter a custom number of questions (5-80):',
            {
              chat_id: chatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '❌ Cancel', callback_data: 'cancel_upload' }]
                ]
              }
            }
          );
        } else {
          const count = parseInt(countType);
          if (isNaN(count) || count < 5 || count > 80) {
            return this.bot.answerCallbackQuery(callbackQuery.id, { 
              text: 'Please enter a number between 5 and 80.' 
            });
          }
          
          session.tempData.totalQuestions = count;
          session.tempData.currentQuestion = 1;
          session.state = states.AWAITING_QUESTION;
          userSessions.set(chatId, session);
          
          await this.startQuestionEntry(chatId, messageId, session);
        }
      }
      // Handle delete question
      else if (data.startsWith('delete_') && session.state === 'AWAITING_DELETE') {
        const questionId = data.split('_')[1];
        
        const question = await Question.findOne({
          where: { id: questionId, createdBy: session.user.id }
        });

        if (!question) {
          return this.bot.answerCallbackQuery(callbackQuery.id, { 
            text: 'Question not found.' 
          });
        }

        await question.destroy();
        
        await Exam.decrement('questionCount', {
          where: { id: question.examId }
        });

        await this.bot.editMessageText('✅ Question deleted!', {
          chat_id: chatId,
          message_id: messageId
        });

        session.state = states.IDLE;
        userSessions.set(chatId, session);
      }
      // Handle cancel action
      else if (data === 'cancel_upload') {
        session.state = states.IDLE;
        session.tempData = {};
        userSessions.set(chatId, session);
        
        await this.bot.editMessageText('❌ Operation cancelled.', {
          chat_id: chatId,
          message_id: messageId
        });
      }
      // Handle confirm/cancel question
      else if (data === 'confirm_question' && session.state === states.CONFIRM_QUESTION) {
        // Save the current question
        await this.saveQuestion(session, chatId);
        
        // Check if we have more questions
        if (session.tempData.currentQuestion < session.tempData.totalQuestions) {
          session.tempData.currentQuestion++;
          session.state = states.AWAITING_QUESTION;
          userSessions.set(chatId, session);
          
          await this.startQuestionEntry(chatId, messageId, session);
        } else {
          // All questions done
          await this.bot.editMessageText(
            `✅ All ${session.tempData.totalQuestions} questions have been saved!\n\n` +
            'You can now return to the main menu or add more questions.',
            {
              chat_id: chatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
                  [{ text: '📝 Add More Questions', callback_data: 'add_more' }]
                ]
              }
            }
          );
          
          session.state = states.IDLE;
          session.tempData = {};
          userSessions.set(chatId, session);
        }
      }
      else if (data === 'edit_question' && session.state === states.CONFIRM_QUESTION) {
        session.state = states.AWAITING_QUESTION;
        userSessions.set(chatId, session);
        
        await this.bot.editMessageText(
          '✏️ Please re-enter the question text:',
          { chat_id: chatId, message_id: messageId }
        );
      }
      else if (data === 'cancel_question' && session.state === states.CONFIRM_QUESTION) {
        session.state = states.IDLE;
        session.tempData = {};
        userSessions.set(chatId, session);
        
        await this.bot.editMessageText(
          '❌ Question entry cancelled. You can start over with /upload',
          { chat_id: chatId, message_id: messageId }
        );
      }
      else if (data === 'main_menu') {
        session.state = states.IDLE;
        session.tempData = {};
        userSessions.set(chatId, session);
        
        await this.bot.editMessageText(
          '🏠 Main Menu\n\n' +
          'What would you like to do?\n' +
          '/upload - Add questions\n' +
          '/list - View your questions\n' +
          '/delete - Remove a question',
          { chat_id: chatId, message_id: messageId }
        );
      }
      else if (data === 'add_more') {
        session.state = states.AWAITING_QUESTION_COUNT;
        session.tempData.questions = [];
        userSessions.set(chatId, session);
        
        // Show question count options again
        const keyboard = {
          inline_keyboard: [
            [{ text: '20 Questions', callback_data: 'count_20' }],
            [{ text: '40 Questions', callback_data: 'count_40' }],
            [{ text: '60 Questions', callback_data: 'count_60' }],
            [{ text: 'Custom Number', callback_data: 'count_custom' }],
            [{ text: '❌ Cancel', callback_data: 'cancel_upload' }]
          ]
        };

        await this.bot.editMessageText(
          `📝 How many more questions would you like to add?`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
          }
        );
      }
    } catch (error) {
      console.error('Callback query error:', error);
      this.bot.answerCallbackQuery(callbackQuery.id, { 
        text: 'An error occurred. Please try again.' 
      });
    }

    this.bot.answerCallbackQuery(callbackQuery.id);
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const session = userSessions.get(chatId);

    if (!session || !session.user || !text) return;
    if (text.startsWith('/')) return; // Skip command messages

    try {
      // Handle custom question count input
      if (session.state === states.AWAITING_CUSTOM_COUNT) {
        const count = parseInt(text.trim());
        
        if (isNaN(count) || count < 5 || count > 80) {
          return this.bot.sendMessage(
            chatId,
            '❌ Please enter a valid number between 5 and 80.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '❌ Cancel', callback_data: 'cancel_upload' }]
                ]
              }
            }
          );
        }
        
        session.tempData.totalQuestions = count;
        session.tempData.currentQuestion = 1;
        session.state = states.AWAITING_QUESTION;
        userSessions.set(chatId, session);
        
        return this.startQuestionEntry(chatId, msg.message_id + 1, session);
      }
      // Handle question text input
      else if (session.state === states.AWAITING_QUESTION) {
        session.tempData.currentQuestionData = {
          questionText: text,
          options: [],
          currentOption: 0
        };
        session.state = states.AWAITING_OPTIONS;
        userSessions.set(chatId, session);
        
        return this.bot.sendMessage(
          chatId,
          '📝 Enter option A:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '❌ Cancel', callback_data: 'cancel_question' }]
              ]
            }
          }
        );
      }
      // Handle options input (one at a time)
      else if (session.state === states.AWAITING_OPTIONS) {
        if (!session.tempData.currentQuestionData) {
          session.tempData.currentQuestionData = { options: [] };
        }
        
        // Add the option
        session.tempData.currentQuestionData.options.push(text);
        
        // If we have less than 4 options, ask for the next one
        if (session.tempData.currentQuestionData.options.length < 4) {
          const nextOption = String.fromCharCode(65 + session.tempData.currentQuestionData.options.length);
          return this.bot.sendMessage(
            chatId,
            `📝 Enter option ${nextOption}:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '❌ Cancel', callback_data: 'cancel_question' }]
                ]
              }
            }
          );
        } 
        // If we have 4 options, ask for the correct answer
        else {
          session.state = states.AWAITING_ANSWER;
          userSessions.set(chatId, session);
          
          const optionsText = session.tempData.currentQuestionData.options
            .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`)
            .join('\n');
            
          return this.bot.sendMessage(
            chatId,
            `✅ All options received!\n\n*Select the correct answer (A-D):*\n\n${optionsText}`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'A', callback_data: 'answer_0' },
                    { text: 'B', callback_data: 'answer_1' },
                    { text: 'C', callback_data: 'answer_2' },
                    { text: 'D', callback_data: 'answer_3' }
                  ],
                  [{ text: '❌ Cancel', callback_data: 'cancel_question' }]
                ]
              }
            }
          );
        }
      }
      // Handle answer selection (via text as fallback)
      else if (session.state === states.AWAITING_ANSWER) {
        const answer = text.trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(answer)) {
          return this.bot.sendMessage(
            chatId,
            '❌ Please select A, B, C, or D using the buttons below.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'A', callback_data: 'answer_0' },
                    { text: 'B', callback_data: 'answer_1' },
                    { text: 'C', callback_data: 'answer_2' },
                    { text: 'D', callback_data: 'answer_3' }
                  ],
                  [{ text: '❌ Cancel', callback_data: 'cancel_question' }]
                ]
              }
            }
          );
        }
        
        // Process the answer
        session.tempData.currentQuestionData.correctOption = answer.charCodeAt(0) - 65;
        session.state = states.CONFIRM_QUESTION;
        userSessions.set(chatId, session);
        
        return this.showQuestionConfirmation(chatId, msg.message_id + 1, session);
      }
    } catch (error) {
      console.error('Message handler error:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
      
      // Reset to a safe state
      session.state = states.IDLE;
      session.tempData = {};
      userSessions.set(chatId, session);
    }
  }

  async handleSubjectSelection(chatId, subjectName, session) {
    const subject = session.user.subjects.find(
      s => s.name.toLowerCase() === subjectName.toLowerCase()
    );

    if (!subject) {
      return this.bot.sendMessage(chatId, '❌ Invalid subject. Try again.');
    }

    let exam = await Exam.findOne({
      where: { subjectId: subject.id, createdBy: session.user.id }
    });

    if (!exam) {
      exam = await Exam.create({
        title: `${subject.name} Quiz`,
        subjectId: subject.id,
        classId: 1, // Default class
        createdBy: session.user.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        duration: 60,
        passingScore: 50,
        questionCount: 0
      });
    }

    session.tempData = { subjectId: subject.id, examId: exam.id };
    session.state = states.AWAITING_QUESTION;
    userSessions.set(chatId, session);

    this.bot.sendMessage(chatId, '✏️ Enter the question text:', {
      reply_markup: { remove_keyboard: true }
    });
  }

  async handleQuestionInput(chatId, questionText, session) {
    if (!questionText.trim()) {
      return this.bot.sendMessage(chatId, 'Please enter a valid question.');
    }

    session.tempData.questionText = questionText.trim();
    session.state = states.AWAITING_OPTIONS;
    userSessions.set(chatId, session);

    this.bot.sendMessage(chatId, 
      '📝 Enter options (one per line, e.g.):\n' +
      'A) Option 1\n' +
      'B) Option 2\n' +
      'C) Option 3\n' +
      'D) Option 4'
    );
  }

  async handleOptionsInput(chatId, optionsText, session) {
    const options = [];
    const lines = optionsText.split('\n');
    const optionRegex = /^([A-D])\)\s*(.+)$/i;

    for (const line of lines) {
      const match = line.trim().match(optionRegex);
      if (match) {
        const [_, letter, text] = match;
        options.push({ id: letter.toUpperCase(), text: text.trim() });
      }
    }

    if (options.length < 2) {
      return this.bot.sendMessage(chatId, 'Please provide at least 2 options (A, B, C, D).');
    }

    session.tempData.options = options;
    session.state = states.AWAITING_ANSWER;
    userSessions.set(chatId, session);

    const keyboard = {
      reply_markup: {
        keyboard: [options.map(opt => ({ text: opt.id }))],
        one_time_keyboard: true
      }
    };

    this.bot.sendMessage(chatId, '✅ Select the correct answer:', keyboard);
  }

  async handleAnswerInput(chatId, answer, session) {
    const selectedOption = answer.trim().toUpperCase();
    const options = session.tempData.options || [];
    
    if (!options.some(opt => opt.id === selectedOption)) {
      return this.bot.sendMessage(chatId, '❌ Invalid selection. Try again.');
    }

    try {
      await Question.create({
        examId: session.tempData.examId,
        text: session.tempData.questionText,
        options: options,
        correctAnswer: selectedOption,
        marks: 1,
        createdBy: session.user.id
      });

      await Exam.increment('questionCount', {
        where: { id: session.tempData.examId }
      });

      session.state = states.IDLE;
      session.tempData = {};
      userSessions.set(chatId, session);

      this.bot.sendMessage(chatId, 
        '✅ Question saved!\n\n' +
        '/upload - Add another question\n' +
        '/list - View questions\n' +
        '/delete - Remove a question',
        { reply_markup: { remove_keyboard: true } }
      );
    } catch (error) {
      console.error('Save error:', error);
      this.bot.sendMessage(chatId, '❌ Failed to save question.');
      
      session.state = states.IDLE;
      session.tempData = {};
      userSessions.set(chatId, session);
    }
  }
}

module.exports = TelegramBotService;
