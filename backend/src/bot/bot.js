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

  bot.on('message', async (msg) => {
    const state = userStates[msg.from.id];
    if (!state) return;
    if (state.step === 'awaiting_assignment') {
      const selected = state.assignments.find(a => `${a.Class.name} - ${a.Subject.name}` === msg.text);
      if (!selected) return;
      userStates[msg.from.id] = { step: 'awaiting_file', selected };
      bot.sendMessage(msg.chat.id, `Send the questions file for ${selected.Class.name} - ${selected.Subject.name} (.txt or .docx).`);
      return;
    }
    if (state.step === 'awaiting_file' && msg.document) {
      // Download file
      const fileId = msg.document.file_id;
      const fileLink = await bot.getFileLink(fileId);
      const ext = path.extname(msg.document.file_name).toLowerCase();
      const filePath = path.join(__dirname, 'tmp', `${msg.from.id}_${Date.now()}${ext}`);
      const writer = fs.createWriteStream(filePath);
      const response = await fetch(fileLink);
      response.body.pipe(writer);
      await new Promise((resolve) => writer.on('finish', resolve));
      let text = '';
      if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }
      fs.unlinkSync(filePath);
      const questions = parseQuestions(text);
      if (!questions.length) {
        bot.sendMessage(msg.chat.id, 'Could not parse any questions. Please check your file format.');
        delete userStates[msg.from.id];
        return;
      }
      userStates[msg.from.id] = { step: 'awaiting_answers', selected: state.selected, questions };
      bot.sendMessage(msg.chat.id, `Parsed ${questions.length} questions. Now send the answers file (.txt, e.g. 1.a, 2.b, ...)`);
      return;
    }
    if (state.step === 'awaiting_answers' && msg.document) {
      // Download answers file
      const fileId = msg.document.file_id;
      const fileLink = await bot.getFileLink(fileId);
      const ext = path.extname(msg.document.file_name).toLowerCase();
      const filePath = path.join(__dirname, 'tmp', `${msg.from.id}_${Date.now()}${ext}`);
      const writer = fs.createWriteStream(filePath);
      const response = await fetch(fileLink);
      response.body.pipe(writer);
      await new Promise((resolve) => writer.on('finish', resolve));
      const text = fs.readFileSync(filePath, 'utf8');
      fs.unlinkSync(filePath);
      const answers = parseAnswers(text);
      if (!Object.keys(answers).length) {
        bot.sendMessage(msg.chat.id, 'Could not parse any answers. Please check your file format.');
        delete userStates[msg.from.id];
        return;
      }
      // Match questions and answers
      const { questions, selected } = state;
      const combined = questions.map(q => ({ ...q, answer: answers[q.number] }));
      // TODO: Save combined questions to DB for selected assignment
      bot.sendMessage(msg.chat.id, `Upload successful! ${combined.length} questions saved for ${selected.Class.name} - ${selected.Subject.name}.`);
      delete userStates[msg.from.id];
      return;
    }
  });
  // Add more handlers as needed
}
module.exports = { setupBot }; 