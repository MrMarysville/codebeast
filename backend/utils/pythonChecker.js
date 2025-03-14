/**
 * Mock Python checker utility
 * 
 * This module previously checked if Python was installed on the system.
 * It has been replaced with a mock that always reports Python as available
 * since the actual Python functionality has been replaced with JavaScript mocks.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Variable to store Python availability status
let isPythonAvailable = false;

/**
 * Check if Python is available on the system
 * 
 * @returns {Promise<boolean>} Whether Python is available
 */
const checkPython = async () => {
  // Determine the Python command based on the operating system
  // On Windows, try 'py' first, then fall back to 'python'
  // On other systems, use 'python' by default
  const isWindows = os.platform() === 'win32';
  const pythonCommand = process.env.PYTHON_PATH || (isWindows ? 'py' : 'python');
  
  return new Promise((resolve) => {
    try {
      // Try to execute Python with version flag
      exec(`${pythonCommand} --version`, (error, stdout, stderr) => {
        if (error) {
          // If 'py' fails on Windows, try 'python' as a fallback
          if (isWindows && pythonCommand === 'py') {
            console.log('Py command failed, trying python command as fallback...');
            exec('python --version', (pyError, pyStdout, pyStderr) => {
              if (pyError) {
                console.warn(`Python check failed: ${error.message}`);
                isPythonAvailable = false;
                return resolve(false);
              }
              
              // Python is available via 'python' command
              const versionOutput = pyStdout || pyStderr;
              console.log(`Python detected: ${versionOutput.trim()}`);
              isPythonAvailable = true;
              resolve(true);
            });
            return;
          }
          
          console.warn(`Python check failed: ${error.message}`);
          isPythonAvailable = false;
          return resolve(false);
        }
        
        // Python is available
        const versionOutput = stdout || stderr;
        console.log(`Python detected: ${versionOutput.trim()}`);
        isPythonAvailable = true;
        resolve(true);
      });
    } catch (error) {
      console.warn(`Python check exception: ${error.message}`);
      isPythonAvailable = false;
      resolve(false);
    }
  });
};

/**
 * Get current Python availability status
 * 
 * @returns {boolean} Whether Python is available
 */
const getPythonStatus = () => {
  return isPythonAvailable;
};

module.exports = {
  checkPython,
  isPythonAvailable: getPythonStatus
};