/**
 * Enhanced logging utility for better error tracking and debugging
 */
const fs = require('fs-extra');
const path = require('path');

// Default log directory
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
fs.ensureDirSync(LOG_DIR);

// Define log files
const LOG_FILES = {
  error: path.join(LOG_DIR, 'error.log'),
  combined: path.join(LOG_DIR, 'combined.log'),
  access: path.join(LOG_DIR, 'access.log'),
  vectorization: path.join(LOG_DIR, 'vectorization.log')
};

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Format a log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} metadata - Additional metadata
 * @returns {string} - Formatted log message
 */
function formatLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const metadataStr = Object.keys(metadata).length 
    ? `\n${JSON.stringify(metadata, null, 2)}` 
    : '';
  
  return `[${timestamp}] [${level}] ${message}${metadataStr}\n`;
}

/**
 * Write to log file
 * @param {string} filePath - Path to log file
 * @param {string} content - Content to write
 */
function writeToLog(filePath, content) {
  try {
    fs.appendFileSync(filePath, content);
  } catch (error) {
    console.error(`Failed to write to log file ${filePath}:`, error);
  }
}

/**
 * Log error
 * @param {string} message - Error message
 * @param {object} metadata - Additional metadata
 */
function error(message, metadata = {}) {
  const formattedLog = formatLog(LOG_LEVELS.ERROR, message, metadata);
  writeToLog(LOG_FILES.error, formattedLog);
  writeToLog(LOG_FILES.combined, formattedLog);
  console.error(message, metadata);
}

/**
 * Log warning
 * @param {string} message - Warning message
 * @param {object} metadata - Additional metadata
 */
function warn(message, metadata = {}) {
  const formattedLog = formatLog(LOG_LEVELS.WARN, message, metadata);
  writeToLog(LOG_FILES.combined, formattedLog);
  console.warn(message, metadata);
}

/**
 * Log info
 * @param {string} message - Info message
 * @param {object} metadata - Additional metadata
 */
function info(message, metadata = {}) {
  const formattedLog = formatLog(LOG_LEVELS.INFO, message, metadata);
  writeToLog(LOG_FILES.combined, formattedLog);
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, metadata);
  }
}

/**
 * Log debug
 * @param {string} message - Debug message
 * @param {object} metadata - Additional metadata
 */
function debug(message, metadata = {}) {
  if (process.env.LOG_LEVEL === 'debug') {
    const formattedLog = formatLog(LOG_LEVELS.DEBUG, message, metadata);
    writeToLog(LOG_FILES.combined, formattedLog);
    console.debug(message, metadata);
  }
}

/**
 * Log access information
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {string} status - HTTP status code
 * @param {string} ip - Client IP address
 * @param {number} responseTime - Response time in ms
 */
function logAccess(method, url, status, ip, responseTime) {
  const logEntry = `[${new Date().toISOString()}] - ${ip} - ${method} ${url} ${status} ${responseTime}ms\n`;
  writeToLog(LOG_FILES.access, logEntry);
}

/**
 * Log vectorization process information
 * @param {string} projectId - Project ID
 * @param {string} stage - Stage of vectorization
 * @param {string} message - Log message
 * @param {object} metadata - Additional metadata
 */
function logVectorization(projectId, stage, message, metadata = {}) {
  const formattedLog = formatLog(LOG_LEVELS.INFO, message, {
    projectId,
    stage,
    ...metadata
  });
  writeToLog(LOG_FILES.vectorization, formattedLog);
  writeToLog(LOG_FILES.combined, formattedLog);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Vectorization] [${projectId}] [${stage}] ${message}`);
  }
}

/**
 * Log Python script execution
 * @param {string} scriptName - Name of the script
 * @param {Array} args - Script arguments
 * @param {string} status - Execution status
 * @param {string} output - Script output
 */
function logPythonScript(scriptName, args, status, output) {
  const level = status === 'error' ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
  const message = `Python script ${scriptName} ${status}`;
  const metadata = {
    scriptName,
    args,
    status,
    output: output ? output.substring(0, 1000) : null // Limit output size
  };
  
  const formattedLog = formatLog(level, message, metadata);
  
  if (level === LOG_LEVELS.ERROR) {
    writeToLog(LOG_FILES.error, formattedLog);
  }
  
  writeToLog(LOG_FILES.combined, formattedLog);
  
  if (level === LOG_LEVELS.ERROR) {
    console.error(message, metadata);
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(message);
  }
}

/**
 * Get all log files
 * @returns {object} - Log file paths
 */
function getLogFiles() {
  return LOG_FILES;
}

module.exports = {
  error,
  warn,
  info,
  debug,
  logAccess,
  logVectorization,
  logPythonScript,
  getLogFiles
}; 