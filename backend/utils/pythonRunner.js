/**
 * Enhanced Python Runner Module
 * 
 * This module provides robust functionality for executing Python scripts with
 * improved error handling, logging, and reliability features.
 */
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const logger = require('./logger');
const shutdownHandler = require('./shutdownHandler');

// Keep track of running Python processes
const runningProcesses = new Map();

/**
 * Get the appropriate Python command based on the operating system
 * @returns {string} - The Python command to use
 */
const getPythonCommand = () => {
  logger.info('Getting Python command for the current environment');
  // On Windows, prefer 'py', on other platforms use 'python'
  const isWindows = os.platform() === 'win32';
  return process.env.PYTHON_PATH || (isWindows ? 'py' : 'python');
};

/**
 * Check if Python is available
 * @returns {Promise<boolean>} - True if Python is available
 */
const isPythonAvailable = async () => {
  try {
    const pythonCommand = getPythonCommand();
    
    return new Promise((resolve) => {
      const process = spawn(pythonCommand, ['--version']);
      
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          logger.info(`Python detected: ${output.trim()}`);
          resolve(true);
        } else {
          logger.warn('Python not available');
          resolve(false);
        }
      });
      
      // Set a timeout in case the process hangs
      setTimeout(() => {
        process.kill();
        logger.warn('Python check timed out');
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    logger.error('Error checking Python availability', { error: error.message });
    return false;
  }
};

/**
 * Get the Python version
 * @returns {string|null} - The Python version or null if not available
 */
const getPythonVersion = () => {
  try {
    // Use actual Python detection instead of mock
    const { execSync } = require('child_process');
    const pythonCommand = getPythonCommand();
    
    try {
      // Try to execute Python to get its version
      const result = execSync(`${pythonCommand} --version`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      logger.info(`Detected Python: ${result}`);
      return result.replace('Python ', '');
    } catch (error) {
      // If that fails, try with '-V' flag which is sometimes needed
      try {
        const result = execSync(`${pythonCommand} -V`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
        logger.info(`Detected Python with -V flag: ${result}`);
        return result.replace('Python ', '');
      } catch (innerError) {
        // Try other common Python commands
        const pythonCommands = ['python3', 'python', 'py'];
        
        for (const cmd of pythonCommands) {
          try {
            if (cmd !== pythonCommand) { // Skip if we already tried this command
              const result = execSync(`${cmd} --version`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
              logger.info(`Detected Python using alternate command '${cmd}': ${result}`);
              return result.replace('Python ', '');
            }
          } catch (cmdError) {
            // Continue to the next command
          }
        }
        
        // If all else fails, return null
        logger.warn(`No Python installation found after trying multiple commands`);
        return null;
      }
    }
  } catch (error) {
    logger.warn(`Failed to get Python version: ${error.message}`);
    return null;
  }
};

/**
 * Check Python dependencies
 * @param {Array} requiredPackages - List of required Python packages
 * @returns {Promise<Object>} - Results of the dependency check
 */
const checkPythonDependencies = async (requiredPackages = ['numpy', 'scikit-learn', 'pandas']) => {
  logger.info('Checking Python dependencies', { requiredPackages });
  
  const pythonAvailable = await isPythonAvailable();
  
  if (!pythonAvailable) {
    logger.warn('Python is not available, providing mock dependency check');
    
    // Generate a mock response when Python is not available
    const dependencies = {};
    requiredPackages.forEach(pkg => {
      dependencies[pkg] = { 
        installed: false, 
        version: 'n/a' 
      };
    });
    
    return {
      success: false,
      message: 'Python is not available',
      dependencies
    };
  }
  
  try {
    const pythonCommand = getPythonCommand();
    const checkScript = `
import sys
import json
import importlib.util

result = {"success": True, "dependencies": {}}

for package in ${JSON.stringify(requiredPackages)}:
    try:
        spec = importlib.util.find_spec(package)
        if spec is None:
            result["dependencies"][package] = {"installed": False, "version": "n/a"}
        else:
            mod = importlib.import_module(package)
            version = getattr(mod, "__version__", "unknown")
            result["dependencies"][package] = {"installed": True, "version": version}
    except Exception as e:
        result["dependencies"][package] = {"installed": False, "version": "n/a", "error": str(e)}

print(json.dumps(result))
`;
    
    return new Promise((resolve, reject) => {
      const process = spawn(pythonCommand, ['-c', checkScript]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            logger.info('Python dependency check completed', result);
            resolve(result);
          } catch (error) {
            logger.error('Failed to parse Python dependency check output', { error: error.message, stdout });
            reject(new Error('Failed to parse Python dependency check output'));
          }
        } else {
          logger.error('Python dependency check failed', { code, stderr });
          reject(new Error(`Python dependency check failed with code ${code}: ${stderr}`));
        }
      });
      
      // Set a timeout in case the process hangs
      setTimeout(() => {
        process.kill();
        logger.error('Python dependency check timed out');
        reject(new Error('Python dependency check timed out'));
      }, 10000);
    });
  } catch (error) {
    logger.error('Error checking Python dependencies', { error: error.message });
    
    return {
      success: false,
      message: `Error checking Python dependencies: ${error.message}`,
      dependencies: {}
    };
  }
};

/**
 * Run Python script with enhanced error handling and logging
 * @param {string} scriptName - The name of the Python script to run
 * @param {Array} args - The arguments to pass to the Python script
 * @returns {Promise<string>} - The output of the Python script
 */
const runPythonScript = async (scriptName, args = []) => {
  const processId = `python-${scriptName}-${Date.now()}`;
  shutdownHandler.registerProcess(processId);
  
  logger.info(`Running Python script: ${scriptName}`, { scriptName, args, processId });
  
  try {
    const pythonAvailable = await isPythonAvailable();
    
    if (!pythonAvailable) {
      logger.warn(`Python is not available, returning mock response for ${scriptName}`);
      return provideMockResponse(scriptName, args);
    }
    
    const pythonCommand = getPythonCommand();
    const scriptPath = path.join(process.env.PYTHON_SCRIPTS_PATH || '../python-scripts', scriptName);
    
    // Ensure the script exists
    if (!fs.existsSync(scriptPath)) {
      logger.error(`Python script not found: ${scriptPath}`);
      throw new Error(`Python script not found: ${scriptPath}`);
    }
    
    return new Promise((resolve, reject) => {
      const process = spawn(pythonCommand, [scriptPath, ...args]);
      
      // Add to running processes map
      runningProcesses.set(processId, process);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        logger.debug(`[Python ${scriptName}] ${chunk.trim()}`);
      });
      
      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        logger.debug(`[Python ${scriptName} ERROR] ${chunk.trim()}`);
      });
      
      process.on('close', (code) => {
        // Remove from running processes
        runningProcesses.delete(processId);
        shutdownHandler.unregisterProcess(processId);
        
        if (code === 0) {
          logger.info(`Python script completed successfully: ${scriptName}`, { exitCode: code });
          logger.logPythonScript(scriptName, args, 'success', stdout);
          resolve(stdout);
        } else {
          const errorMessage = `Python script failed with code ${code}: ${stderr}`;
          logger.error(`Python script failed: ${scriptName}`, { exitCode: code, stderr });
          logger.logPythonScript(scriptName, args, 'error', stderr);
          reject(new Error(errorMessage));
        }
      });
      
      process.on('error', (error) => {
        // Remove from running processes
        runningProcesses.delete(processId);
        shutdownHandler.unregisterProcess(processId);
        
        logger.error(`Error starting Python script: ${scriptName}`, { error: error.message });
        logger.logPythonScript(scriptName, args, 'error', error.message);
        reject(error);
      });
      
      // Set a timeout based on script name
      // Some scripts like vectorization can take longer
      const timeout = scriptName.includes('vector') ? 600000 : 60000; // 10 minutes for vectorization, 1 minute for others
      
      setTimeout(() => {
        if (runningProcesses.has(processId)) {
          process.kill();
          runningProcesses.delete(processId);
          shutdownHandler.unregisterProcess(processId);
          
          const timeoutError = `Python script timed out after ${timeout/1000} seconds`;
          logger.error(`Python script timed out: ${scriptName}`, { timeout });
          logger.logPythonScript(scriptName, args, 'error', timeoutError);
          reject(new Error(timeoutError));
        }
      }, timeout);
    });
  } catch (error) {
    // Ensure process is unregistered
    shutdownHandler.unregisterProcess(processId);
    
    logger.error(`Error running Python script: ${scriptName}`, { error: error.message });
    logger.logPythonScript(scriptName, args, 'error', error.message);
    throw error;
  }
};

/**
 * Provide mock response for Python scripts when Python is not available
 * @param {string} scriptName - The name of the Python script
 * @param {Array} args - The arguments passed to the script
 * @returns {string} - JSON string with mock response
 */
function provideMockResponse(scriptName, args) {
  logger.info(`Providing mock response for: ${scriptName}`, { args });
  
  // Determine which mock response to return based on the script name
  let response;
  
  switch (scriptName) {
    case 'vectorize.py':
    case 'simple_vector.py':
    case 'enhanced_vectorize.py':
    case 'incremental_vectorize.py':
      response = {
        success: true,
        files_processed: 15,
        vectors_created: 120,
        languages_detected: ['javascript', 'typescript', 'jsx', 'css', 'html'],
        message: '[Mock] Vectorization completed successfully'
      };
      break;
      
    case 'process_feature.py':
      response = {
        success: true,
        feature_processed: true,
        message: '[Mock] Feature processed successfully'
      };
      break;
      
    case 'get_vector_info.py':
      response = {
        success: true,
        total_vectors: 120,
        languages: {
          javascript: 65,
          typescript: 30,
          jsx: 15,
          css: 5,
          html: 5
        },
        message: '[Mock] Vector information retrieved successfully'
      };
      break;
      
    case 'generate_vector_cache_stats.py':
      response = {
        success: true,
        cache_size: 1024000,
        efficiency: 85,
        hit_rate: 92,
        languages: {
          javascript: { vectors: 65, bytes: 520000 },
          typescript: { vectors: 30, bytes: 240000 },
          jsx: { vectors: 15, bytes: 120000 },
          css: { vectors: 5, bytes: 40000 },
          html: { vectors: 5, bytes: 40000 }
        },
        message: '[Mock] Vector cache statistics generated successfully'
      };
      break;
      
    case 'delta_encoding.py':
      response = {
        success: true,
        encoded: true,
        compression_ratio: 0.65,
        message: '[Mock] Delta encoding completed successfully'
      };
      break;
      
    case 'apply_changes.py':
      response = {
        success: true,
        changes_applied: 8,
        message: '[Mock] Changes applied successfully'
      };
      break;
      
    case 'adjust_ui.py':
      response = {
        success: true,
        components_adjusted: 5,
        message: '[Mock] UI adjustments completed successfully'
      };
      break;
      
    default:
      logger.warn(`Unknown Python script: ${scriptName} - returning generic success response`);
      response = {
        success: true,
        message: `[Mock] Script ${scriptName} executed successfully`
      };
  }
  
  return JSON.stringify(response);
}

/**
 * Kill all running Python processes
 * @returns {Promise<void>}
 */
const killAllPythonProcesses = async () => {
  logger.info(`Killing all Python processes (${runningProcesses.size} running)`);
  
  const promises = [];
  
  for (const [id, process] of runningProcesses.entries()) {
    logger.info(`Killing Python process: ${id}`);
    
    try {
      process.kill();
      shutdownHandler.unregisterProcess(id);
      runningProcesses.delete(id);
    } catch (error) {
      logger.error(`Error killing Python process: ${id}`, { error: error.message });
      promises.push(Promise.reject(error));
    }
  }
  
  return Promise.allSettled(promises);
};

module.exports = {
  runPythonScript,
  getPythonCommand,
  checkPythonDependencies,
  isPythonAvailable,
  killAllPythonProcesses,
  getPythonVersion
};