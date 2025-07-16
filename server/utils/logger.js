const winston = require('winston');
const path = require('path');

const logDirectory = path.join(__dirname, '../logs');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: `${logDirectory}/error.log`, level: 'error' }),
    new winston.transports.File({ filename: `${logDirectory}/combined.log` }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: `${logDirectory}/exceptions.log` }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: `${logDirectory}/rejections.log` }),
  ],
});

module.exports = logger;
