/**
 * Robust Application Startup Script
 * 
 * This script provides a reliable way to start the application, handling various
 * common issues like port conflicts, process management, and automatic restart.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY_MS = 5000;
const LOG_DIR = path.join(__dirname, 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create log streams
const logFile = fs.createWriteStream(path.join(LOG_DIR, 'app-startup.log'), { flags: 'a' });
const errorLogFile = fs.createWriteStream(path.join(LOG_DIR, 'app-startup-error.log'), { flags: 'a' });

// Log to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
}

function logError(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}`;
  console.error(logMessage);
  errorLogFile.write(logMessage + '\n');
}

/**
 * Kills processes running on specified ports
 * @param {number[]} ports - Ports to free
 */
function killPortProcesses(ports) {
  try {
    log(`Killing processes on ports: ${ports.join(', ')}`);
    
    // Run our kill-ports script
    execSync('node kill-ports.js', { stdio: 'inherit' });
    
    // Verify the ports are free
    for (const port of ports) {
      if (isPortInUse(port)) {
        logError(`Port ${port} is still in use after kill attempts`);
      } else {
        log(`Port ${port} is now free`);
      }
    }
  } catch (error) {
    logError(`Error killing port processes: ${error.message}`);
  }
}

/**
 * Checks if a port is in use
 * @param {number} port - Port to check
 * @returns {boolean} - True if port is in use
 */
function isPortInUse(port) {
  try {
    const platform = os.platform();
    
    if (platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
      return result.includes('LISTENING');
    } else {
      // Unix-like systems
      try {
        const result = execSync(`lsof -i:${port}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
        return result.length > 0;
      } catch (e) {
        // lsof returns non-zero exit code if no process is using the port
        return false;
      }
    }
  } catch (error) {
    // If the command fails, assume the port is not in use
    return false;
  }
}

/**
 * Starts the backend server
 * @returns {object} - The backend process
 */
function startBackend() {
  log('Starting backend server...');
  
  const backend = spawn('npm', ['run', 'start:backend'], {
    stdio: 'pipe',
    shell: true
  });
  
  backend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`[Backend] ${output}`);
    }
  });
  
  backend.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      logError(`[Backend] ${output}`);
    }
  });
  
  backend.on('close', (code) => {
    if (code !== 0) {
      logError(`Backend process exited with code ${code}`);
    } else {
      log('Backend process exited normally');
    }
  });
  
  return backend;
}

/**
 * Starts the frontend server
 * @returns {object} - The frontend process
 */
function startFrontend() {
  log('Starting frontend server...');
  
  const frontend = spawn('npm', ['run', 'start:frontend'], {
    stdio: 'pipe',
    shell: true
  });
  
  frontend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`[Frontend] ${output}`);
    }
  });
  
  frontend.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      logError(`[Frontend] ${output}`);
    }
  });
  
  frontend.on('close', (code) => {
    if (code !== 0) {
      logError(`Frontend process exited with code ${code}`);
    } else {
      log('Frontend process exited normally');
    }
  });
  
  return frontend;
}

/**
 * Main application startup function
 */
function startApp() {
  log('Starting application...');
  
  // Kill processes using our ports
  killPortProcesses([3001, 5001]);
  
  // Start backend and frontend
  const backend = startBackend();
  
  // Wait for backend to start before starting frontend
  setTimeout(() => {
    const frontend = startFrontend();
    
    // Handle process termination
    process.on('SIGINT', () => {
      log('Received SIGINT, shutting down...');
      backend.kill();
      frontend.kill();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      log('Received SIGTERM, shutting down...');
      backend.kill();
      frontend.kill();
      process.exit(0);
    });
  }, 5000);
  
  log('Application startup process completed');
}

// Start the application
startApp(); 