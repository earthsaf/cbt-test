const winston = require('winston');
const { combine, timestamp, printf, colorize, align } = winston.format;

// Define log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ' ' + JSON.stringify(metadata, null, 2);
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    align(),
    logFormat
  ),
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to `combined.log`
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exitOnError: false
});

// If we're not in production then log to the `console` with the format:
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      align(),
      logFormat
    )
  }));
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Add stream for morgan
logger.stream = {
  write: function(message, encoding) {
    logger.info(message.trim());
  },
};

module.exports = logger;
