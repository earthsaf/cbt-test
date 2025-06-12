const TelegramBot = require('node-telegram-bot-api');
let bot;
function setupBot() {
  if (bot) return;
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  bot.onText(/\/cbt (exam|test)/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Select class: (not implemented)');
  });
  bot.onText(/\/upload/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Send questions.txt file. (not implemented)');
  });
  // Add more handlers as needed
}
module.exports = { setupBot }; 