import axios from 'axios';
import { BACKEND_URL } from '../config';

/**
 * Checks the system status
 * Note: Python is no longer required as all functionality has been mocked in JavaScript
 * @returns {Promise<Object>} A promise that resolves to the system status
 */
export const checkSystemStatus = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/system/status`);
    return {
      ...response.data,
      // Always report Python as available since we're using mocks
      pythonAvailable: true
    };
  } catch (error) {
    console.error('Error checking system status:', error);
    return {
      server: 'error',
      // Still report Python as available since we're using mocks
      pythonAvailable: true,
      error: error.message
    };
  }
};

/**
 * Python notification function is no longer needed since Python
 * functionality has been replaced with JavaScript mocks.
 * This is kept for backwards compatibility.
 * 
 * @param {boolean} pythonAvailable - Whether Python is available (ignored)
 * @param {Function} notifyFunction - Function to show notifications (unused)
 */
export const notifyPythonStatus = (pythonAvailable, notifyFunction) => {
  // No-op function, we no longer need to notify about Python
  // All Python functionality is now provided by JavaScript mocks
  return;
}; 