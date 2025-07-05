const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
  })
);

// File rotation transport
const fileRotateTransport = new DailyRotateFile({
  filename: config.LOG_FILE,
  datePattern: 'YYYY-MM-DD',
  maxSize: config.LOG_MAX_SIZE,
  maxFiles: config.LOG_MAX_FILES,
  zippedArchive: true,
  level: config.LOG_LEVEL
});

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports: [
    fileRotateTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: './logs/exceptions.log' })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: './logs/rejections.log' })
  ]
});

// Log rotation event handlers
fileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Log rotated from ${oldFilename} to ${newFilename}`);
});

fileRotateTransport.on('new', (newFilename) => {
  logger.info(`New log file created: ${newFilename}`);
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logDir = path.dirname(config.LOG_FILE);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Export logger with additional methods
module.exports = {
  logger,
  
  // Express middleware for HTTP request logging
  requestLogger: (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    
    res.send = function(body) {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
      
      if (config.VERBOSE_LOGGING) {
        logger.debug(`Request body: ${JSON.stringify(req.body)}`);
        logger.debug(`Response body: ${typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200)}`);
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  },
  
  // Database query logger
  queryLogger: (query, duration) => {
    if (config.VERBOSE_LOGGING) {
      logger.debug(`Database query executed in ${duration}ms: ${query}`);
    }
  },
  
  // Error logger with context
  errorLogger: (error, context = {}) => {
    logger.error(`Error occurred: ${error.message}`, {
      error: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },
  
  // Performance logger
  performanceLogger: (operation, duration, metadata = {}) => {
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operation} took ${duration}ms`, metadata);
    } else if (config.VERBOSE_LOGGING) {
      logger.debug(`Operation ${operation} completed in ${duration}ms`, metadata);
    }
  }
}; 