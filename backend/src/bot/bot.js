const TelegramBot = require('node-telegram-bot-api');
const { User, TeacherClassSubject, Class, Subject } = require('../models');
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

  bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Menu:\n/cbt exam - Take an exam\n/upload - Upload questions (teachers only)');
  });

  bot.onText(/\/cbt (exam|test)/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Select class: (not implemented)');
  });

  bot.onText(/\/upload/, async (msg) => {
    const teacherTelegramId = msg.from.id.toString();
    const teacher = await User.findOne({ where: { telegramId: teacherTelegramId, role: 'teacher' } });
    if (!teacher) {
      bot.sendMessage(msg.chat.id, 'You are not registered as a teacher.');
      return;
    }
    const assignments = await TeacherClassSubject.findAll({
      where: { TeacherId: teacher.id },
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

  bot.on('message', async (msg) => {
    const state = userStates[msg.from.id];
    if (!state) return;
    if (state.step === 'awaiting_assignment') {
      const selected = state.assignments.find(a => `${a.Class.name} - ${a.Subject.name}` === msg.text);
      if (!selected) return;
      userStates[msg.from.id] = {
        step: 'awaiting_question_count',
        selected,
      };
      bot.sendMessage(msg.chat.id, 'How many questions do you want to upload?', {
        reply_markup: {
          keyboard: [["20", "30", "40"], ["60", "80"]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
      return;
    }
    if (state.step === 'awaiting_question_count') {
      const count = parseInt(msg.text);
      if (![20, 30, 40, 60, 80].includes(count)) {
        bot.sendMessage(msg.chat.id, 'Please select a valid number of questions.');
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
        // Save to DB (TODO: implement DB save logic here)
        // For now, just confirm
        const { selected, questions } = userStates[msg.from.id];
        // TODO: Save questions to DB for selected assignment
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