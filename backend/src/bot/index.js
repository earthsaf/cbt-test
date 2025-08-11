const TelegramBotService = require('./telegramBot');

// Initialize Telegram Bot if token is provided
const initTelegramBot = () => {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!telegramToken) {
    console.warn('TELEGRAM_BOT_TOKEN not provided. Telegram bot will not be started.');
    return null;
  }

  try {
    const bot = new TelegramBotService(telegramToken);
    console.log('✅ Telegram bot initialized');
    return bot;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    return null;
  }
};

module.exports = {
  initTelegramBot
};
