const { User } = require('../models');
const { Op } = require('sequelize');

// Try to require logger, but don't fail if it doesn't exist
let logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

try {
  // Try to use the winston logger if available
  const winstonLogger = require('../utils/logger');
  if (winstonLogger) {
    logger = winstonLogger;
  }
} catch (e) {
  // Fallback to console if logger is not available
  console.warn('Using console as fallback logger. For production, please install winston and ensure proper logger configuration.');
}

// This will be set by the bot initialization
let botInstance = null;

/**
 * Set the Telegram bot instance to be used for sending notifications
 * @param {TelegramBot} bot - The initialized Telegram bot instance
 */
function setBotInstance(bot) {
  botInstance = bot;
  logger.info('Telegram bot instance set for notifications');
}

/**
 * Send a notification to a teacher via Telegram
 * @param {number|string} teacherId - The ID of the teacher in the database
 * @param {string} message - The message to send
 * @returns {Promise<boolean>} - Whether the notification was sent successfully
 */
async function notifyTeacher(teacherId, message) {
  try {
    if (!botInstance) {
      const errorMsg = 'Telegram bot instance not initialized. Cannot send notification.';
      logger.warn(errorMsg);
      return false;
    }

    if (!teacherId || !message) {
      logger.warn('Missing required parameters for notifyTeacher');
      return false;
    }

    // Find the teacher by ID and get their Telegram ID
    const teacher = await User.findOne({
      where: { 
        id: teacherId, 
        role: 'teacher',
        telegram_id: { [Op.ne]: null } // Only if they have a Telegram ID
      },
      attributes: ['id', 'name', 'telegram_id'],
      raw: true
    });

    if (!teacher || !teacher.telegram_id) {
      logger.warn(`Teacher ${teacherId} not found or has no Telegram ID configured`);
      return false;
    }

    // Send the message
    await botInstance.sendMessage(teacher.telegram_id, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    logger.info(`Notification sent to teacher ${teacherId} (${teacher.name})`);
    return true;
  } catch (error) {
    logger.error(`Failed to send notification to teacher ${teacherId}:`, error);
    return false;
  }
}

/**
 * Send a notification to multiple teachers
 * @param {Array<number|string>} teacherIds - Array of teacher IDs
 * @param {string} message - The message to send
 * @returns {Promise<{success: number, failed: number}>} - Count of successful and failed notifications
 */
async function notifyTeachers(teacherIds, message) {
  if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  // Process notifications in parallel with rate limiting
  const BATCH_SIZE = 5; // Process 5 at a time to avoid rate limiting
  
  for (let i = 0; i < teacherIds.length; i += BATCH_SIZE) {
    const batch = teacherIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(id => notifyTeacher(id, message))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < teacherIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { success, failed };
}

module.exports = {
  setBotInstance,
  notifyTeacher,
  notifyTeachers
};
