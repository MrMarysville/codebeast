/**
 * Port Manager Utility
 * 
 * Provides functions to manage port availability, check if ports are in use,
 * and find available ports.
 */

const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('./logger');
const os = require('os');

/**
 * Check if a port is in use
 * 
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - True if the port is in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port, '127.0.0.1');
  });
}

/**
 * Find a free port starting from the given port
 * 
 * @param {number} startPort - The port to start checking from
 * @param {number} [maxAttempts=10] - Maximum number of ports to check
 * @returns {Promise<number|null>} - Available port or null if none found
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    const inUse = await isPortInUse(port);
    
    if (!inUse) {
      return port;
    }
  }
  
  return null; // No available port found
}

/**
 * Try to free a port by killing the process using it
 * 
 * @param {number} port - The port to free
 * @param {number} [timeoutMs=3000] - Timeout in milliseconds
 * @returns {Promise<boolean>} - Whether the port was successfully freed
 */
async function freePort(port, timeoutMs = 3000) {
  try {
    logger.info(`Port ${port} is already in use. Attempting to close existing connections...`);

    // Different commands for different platforms
    let command;
    
    if (os.platform() === 'win32') {
      // Windows
      command = `FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') DO taskkill /F /PID %P`;
    } else {
      // Unix-like (Linux, macOS)
      command = `lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`;
    }
    
    await execAsync(command).catch(() => {
      // Ignore errors, as the command might fail if there's no process
    });
    
    // Wait a bit to ensure the port is released
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if the port is now available
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const inUse = await isPortInUse(port);
      if (!inUse) {
        logger.info(`Successfully freed port ${port}`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.error(`Failed to free port ${port} after timeout`);
    return false;
  } catch (error) {
    logger.error(`Error while trying to free port ${port}:`, error);
    return false;
  }
}

/**
 * Ensure a port is available for use
 * 
 * @param {number} port - Preferred port
 * @param {Object} [options] - Options
 * @param {boolean} [options.tryToFree=true] - Whether to try to free the port if in use
 * @param {number} [options.fallbackStartPort] - Start of fallback port range
 * @param {boolean} [options.returnAny=false] - Return any available port if preferred is unavailable
 * @returns {Promise<{available: boolean, port: number}>} - Port availability status
 */
async function ensurePortAvailable(port, options = {}) {
  const {
    tryToFree = true,
    fallbackStartPort = port + 1,
    returnAny = false
  } = options;
  
  // Check if preferred port is already available
  const inUse = await isPortInUse(port);
  
  if (!inUse) {
    return { available: true, port };
  }
  
  // Try to free the port if requested
  if (tryToFree) {
    const freed = await freePort(port);
    if (freed) {
      return { available: true, port };
    }
  }
  
  // If we're allowed to use any port, find an available one
  if (returnAny) {
    const availablePort = await findAvailablePort(fallbackStartPort);
    if (availablePort) {
      logger.info(`Preferred port ${port} is unavailable, using port ${availablePort} instead`);
      return { available: true, port: availablePort };
    }
  }
  
  // Port is unavailable and we couldn't find an alternative
  return { available: false, port };
}

/**
 * Check multiple ports and return their status
 * 
 * @param {number[]} ports - Array of ports to check
 * @returns {Promise<Object>} - Status of each port
 */
async function checkPorts(ports) {
  const results = {};
  
  for (const port of ports) {
    results[port] = await isPortInUse(port);
  }
  
  return results;
}

module.exports = {
  isPortInUse,
  findAvailablePort,
  freePort,
  ensurePortAvailable,
  checkPorts
}; 