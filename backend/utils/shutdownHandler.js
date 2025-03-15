/**
 * Graceful shutdown handler for the server
 * Ensures all connections are properly closed before shutting down
 */
const fs = require('fs-extra');
const path = require('path');

// Track in-flight requests
let connections = {};
let connectionCounter = 0;
let shuttingDown = false;

// Keep track of active processes
const activeProcesses = new Set();

/**
 * Register an active process
 * @param {string} id - Process identifier
 */
function registerProcess(id) {
  activeProcesses.add(id);
}

/**
 * Unregister a completed process
 * @param {string} id - Process identifier
 */
function unregisterProcess(id) {
  activeProcesses.delete(id);
}

/**
 * Check if there are any active processes
 * @returns {boolean} - True if active processes exist
 */
function hasActiveProcesses() {
  return activeProcesses.size > 0;
}

/**
 * Get active processes
 * @returns {Array} - Array of active process IDs
 */
function getActiveProcesses() {
  return Array.from(activeProcesses);
}

/**
 * Setup handlers for graceful shutdown
 * @param {object} server - HTTP server instance
 * @param {string} uploadsDir - Directory for uploaded files
 */
function setupGracefulShutdown(server, uploadsDir) {
  // Track all connections
  server.on('connection', (connection) => {
    const id = connectionCounter++;
    connections[id] = connection;
    
    connection.on('close', () => {
      delete connections[id];
    });
  });

  // Handle cleanup on shutdown signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach((signal) => {
    process.on(signal, () => {
      shutdown(server, uploadsDir, signal);
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown(server, uploadsDir, 'uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown(server, uploadsDir, 'unhandledRejection');
  });
}

/**
 * Gracefully shutdown the server
 * @param {object} server - HTTP server instance
 * @param {string} uploadsDir - Directory for uploaded files
 * @param {string} signal - Signal that triggered the shutdown
 */
function shutdown(server, uploadsDir, signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Create a shutdown status file
  const statusFile = path.join(uploadsDir, '.shutdown_status.json');
  fs.writeJsonSync(statusFile, {
    status: 'shutdown',
    timestamp: new Date().toISOString(),
    activeProcesses: getActiveProcesses()
  }, { spaces: 2 });
  
  // Set a forced shutdown timeout
  const forcedShutdownTimeout = setTimeout(() => {
    console.log('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
  
  // If we have active processes, warn about them
  if (hasActiveProcesses()) {
    console.log(`Warning: ${activeProcesses.size} active processes will be terminated:`);
    console.log(getActiveProcesses());
  }
  
  // Close the server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close all open connections
    Object.keys(connections).forEach((key) => {
      connections[key].destroy();
    });
    
    clearTimeout(forcedShutdownTimeout);
    console.log('Graceful shutdown completed');
    process.exit(0);
  });
}

module.exports = {
  setupGracefulShutdown,
  registerProcess,
  unregisterProcess,
  hasActiveProcesses,
  getActiveProcesses
}; 