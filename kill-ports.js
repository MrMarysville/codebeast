/**
 * Enhanced port killing utility
 * 
 * Ensures that specified ports are free before starting the application
 * Works on both Windows and Unix-like systems
 */

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Ports to kill
const PORTS_TO_KILL = [3001, 5001];

// Log to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // Append to log file
  try {
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(
      path.join(logDir, 'port-killer.log'),
      logMessage + '\n'
    );
  } catch (error) {
    console.error(`Error writing to log: ${error.message}`);
  }
}

/**
 * Kill process using a port on Windows
 * @param {number} port - Port to free
 */
function killPortWindows(port) {
  try {
    log(`Checking if port ${port} is in use on Windows...`);
    
    // Find PIDs using the port
    const findPidCommand = `netstat -ano | findstr :${port}`;
    let result;
    
    try {
      result = execSync(findPidCommand, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    } catch (error) {
      // If the command fails, it likely means no process is using the port
      log(`No process found using port ${port}`);
      return;
    }
    
    // Extract PIDs from the result
    const pidMatches = result.match(/LISTENING\s+(\d+)/g);
    if (!pidMatches || pidMatches.length === 0) {
      log(`No listening process found on port ${port}`);
      return;
    }
    
    // Kill each PID
    const pids = [...new Set(pidMatches.map(match => match.replace('LISTENING', '').trim()))];
    
    pids.forEach(pid => {
      try {
        log(`Killing process ${pid} using port ${port}...`);
        execSync(`taskkill /F /PID ${pid}`);
        log(`Successfully killed process ${pid}`);
      } catch (killError) {
        log(`Error killing process ${pid}: ${killError.message}`);
      }
    });
  } catch (error) {
    log(`Error in killPortWindows: ${error.message}`);
  }
}

/**
 * Kill process using a port on Unix-like systems
 * @param {number} port - Port to free
 */
function killPortUnix(port) {
  try {
    log(`Checking if port ${port} is in use on Unix...`);
    
    // Find PIDs using the port
    const findPidCommand = `lsof -t -i:${port}`;
    let result;
    
    try {
      result = execSync(findPidCommand, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    } catch (error) {
      // If the command fails, it likely means no process is using the port
      log(`No process found using port ${port}`);
      return;
    }
    
    if (!result) {
      log(`No process found using port ${port}`);
      return;
    }
    
    // Kill each PID
    const pids = result.split('\n').filter(Boolean);
    
    pids.forEach(pid => {
      try {
        log(`Killing process ${pid} using port ${port}...`);
        execSync(`kill -9 ${pid}`);
        log(`Successfully killed process ${pid}`);
      } catch (killError) {
        log(`Error killing process ${pid}: ${killError.message}`);
      }
    });
  } catch (error) {
    log(`Error in killPortUnix: ${error.message}`);
  }
}

/**
 * Verify if a port is in use
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

// Main function
function killPorts() {
  log('Starting port killer utility...');
  
  const platform = os.platform();
  log(`Detected platform: ${platform}`);
  
  for (const port of PORTS_TO_KILL) {
    if (platform === 'win32') {
      killPortWindows(port);
    } else {
      killPortUnix(port);
    }
    
    // Verify the port is now free
    if (isPortInUse(port)) {
      log(`WARNING: Port ${port} is still in use after kill attempts`);
    } else {
      log(`Port ${port} is now free`);
    }
  }
  
  log('Port killer utility completed');
}

// Run the utility
killPorts(); 