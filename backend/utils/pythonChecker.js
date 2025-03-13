/**
 * Mock Python checker utility
 * 
 * This module previously checked if Python was installed on the system.
 * It has been replaced with a mock that always reports Python as available
 * since the actual Python functionality has been replaced with JavaScript mocks.
 */

// Always return true for Python availability - no actual Python needed
let pythonAvailable = true;
let pythonCommand = 'mock-python';

/**
 * Mock Python check function
 * Always reports Python as available
 * @returns {Promise<boolean>} - Always returns true
 */
const checkPython = async () => {
    console.log('Mock Python checker called (Python not required)');
    console.log('Python is being mocked with JavaScript implementations');
    return true;
};

/**
 * Always reports Python as available
 * @returns {boolean} - Always returns true
 */
const isPythonAvailable = () => true;

/**
 * Returns a mock Python command
 * @returns {string} - Returns a mock Python command
 */
const getPythonCommand = () => 'mock-python';

module.exports = {
    checkPython,
    isPythonAvailable,
    getPythonCommand
};