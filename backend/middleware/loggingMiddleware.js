/**
 * Logging middleware for request/response tracking
 */
const morgan = require('morgan');
const fs = require('fs-extra');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
fs.ensureDirSync(logsDir);

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Custom token for request body
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Don't log sensitive information
    const sanitizedBody = { ...req.body };
    
    // Remove sensitive fields
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    if (sanitizedBody.apiKey) sanitizedBody.apiKey = '[REDACTED]';
    
    return JSON.stringify(sanitizedBody);
  }
  return '';
});

// Custom token for response time
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) {
    return '';
  }
  
  const ms = (res._startAt[0] - req._startAt[0]) * 1000 +
             (res._startAt[1] - req._startAt[1]) * 1e-6;
  
  return ms.toFixed(2);
});

// Custom token for user ID
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

// Development logging format - colorful and detailed
const developmentFormat = morgan((tokens, req, res) => {
  return [
    '\n🔍 ',
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time-ms'](req, res), 'ms',
    '- User:', tokens['user-id'](req, res),
    '\n📦 Body:', tokens.body(req, res),
    '\n'
  ].join(' ');
});

// Production logging format - compact and machine-readable
const productionFormat = morgan(
  ':remote-addr - :user-id [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms',
  { stream: accessLogStream }
);

// Request start time capture middleware
const startTimeCapture = (req, res, next) => {
  req._startAt = process.hrtime();
  
  // Capture response finish time
  res.on('finish', () => {
    res._startAt = process.hrtime();
  });
  
  next();
};

// Export middleware based on environment
const getLoggingMiddleware = () => {
  if (process.env.NODE_ENV === 'production') {
    return [startTimeCapture, productionFormat];
  }
  return [startTimeCapture, developmentFormat];
};

module.exports = getLoggingMiddleware; 