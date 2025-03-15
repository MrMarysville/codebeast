/**
 * Test script for the enhanced vectorization functionality
 * 
 * This script demonstrates how to use the new vectorization API
 * to process a project directory and monitor the progress.
 */
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Make API requests with error handling
 */
async function apiRequest(method, endpoint, data = null) {
  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`${colors.blue}Making ${method} request to: ${url}${colors.reset}`);
    
    const response = await axios({
      method,
      url,
      data,
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error(`${colors.red}API Error: ${error.message}${colors.reset}`);
    
    if (error.response) {
      console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Data: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    }
    
    throw error;
  }
}

/**
 * Start vectorization for a project directory
 */
async function startVectorization(projectPath, options = {}) {
  const requestData = {
    projectPath,
    ...options
  };
  
  const response = await apiRequest('post', '/vectorize/project', requestData);
  return response;
}

/**
 * Get vectorization job status
 */
async function getJobStatus(jobId) {
  return await apiRequest('get', `/vectorize/status/${jobId}`);
}

/**
 * Cancel a vectorization job
 */
async function cancelVectorization(jobId) {
  return await apiRequest('post', `/vectorize/cancel/${jobId}`);
}

/**
 * Poll job status until completion
 */
async function pollJobStatus(jobId, interval = 1000) {
  let lastProgress = -1;
  let lastStatus = '';
  
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const response = await getJobStatus(jobId);
        
        const { status, progress, filesProcessed, filesTotal, error } = response;
        
        // Only log when there's a change in status or progress
        if (status !== lastStatus || progress !== lastProgress) {
          lastStatus = status;
          lastProgress = progress;
          
          // Clear line and move cursor to beginning
          process.stdout.write('\r\x1b[K');
          
          let statusColor;
          switch (status) {
            case 'completed':
              statusColor = colors.green;
              break;
            case 'failed':
              statusColor = colors.red;
              break;
            case 'vectorizing':
              statusColor = colors.cyan;
              break;
            default:
              statusColor = colors.yellow;
          }
          
          // Print status with progress bar
          process.stdout.write(
            `${statusColor}Status: ${status.toUpperCase()}${colors.reset} | ` +
            `Progress: ${progress}% | ` +
            `Files: ${filesProcessed}/${filesTotal} | ` +
            `Elapsed: ${Math.floor((Date.now() - response.startTime) / 1000)}s`
          );
        }
        
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          clearInterval(timer);
          console.log(); // Add a newline
          
          if (status === 'failed') {
            console.error(`${colors.red}Error: ${error}${colors.reset}`);
            reject(new Error(`Vectorization failed: ${error}`));
          } else {
            resolve(response);
          }
        }
      } catch (error) {
        clearInterval(timer);
        console.error(`${colors.red}Polling error: ${error.message}${colors.reset}`);
        reject(error);
      }
    }, interval);
  });
}

/**
 * Main function to test vectorization
 */
async function main() {
  try {
    // Get project directory from command line argument or prompt
    let projectPath = process.argv[2];
    
    if (!projectPath) {
      projectPath = await new Promise(resolve => {
        rl.question(`${colors.yellow}Enter the project directory path: ${colors.reset}`, resolve);
      });
    }
    
    // Validate the path
    if (!fs.existsSync(projectPath)) {
      console.error(`${colors.red}Error: Directory does not exist: ${projectPath}${colors.reset}`);
      process.exit(1);
    }
    
    // Get vectorization method
    const vectorizationMethod = await new Promise(resolve => {
      rl.question(
        `${colors.yellow}Choose vectorization method (simple, enhanced, incremental) [enhanced]: ${colors.reset}`,
        (answer) => resolve(answer || 'enhanced')
      );
    });
    
    // Get file types
    const fileTypesStr = await new Promise(resolve => {
      rl.question(
        `${colors.yellow}Enter file types to include (comma-separated, leave empty for all): ${colors.reset}`,
        resolve
      );
    });
    
    const fileTypes = fileTypesStr ? fileTypesStr.split(',').map(t => t.trim()) : null;
    
    // Start the vectorization
    console.log(`${colors.cyan}Starting vectorization for: ${projectPath}${colors.reset}`);
    console.log(`${colors.cyan}Method: ${vectorizationMethod}${colors.reset}`);
    
    if (fileTypes) {
      console.log(`${colors.cyan}File types: ${fileTypes.join(', ')}${colors.reset}`);
    } else {
      console.log(`${colors.cyan}File types: All${colors.reset}`);
    }
    
    const vectorizationOptions = {
      vectorizationMethod
    };
    
    if (fileTypes) {
      vectorizationOptions.fileTypes = fileTypes;
    }
    
    // Start the job
    const startResponse = await startVectorization(projectPath, vectorizationOptions);
    console.log(`${colors.green}Vectorization job started:${colors.reset}`);
    console.log(JSON.stringify(startResponse, null, 2));
    
    const { jobId } = startResponse;
    
    // Ask if the user wants to cancel the job
    let cancelRequested = false;
    const cancelPrompt = () => {
      rl.question(`${colors.yellow}Press 'c' to cancel the job, or any other key to continue: ${colors.reset}`, async (answer) => {
        if (answer.toLowerCase() === 'c') {
          try {
            console.log(`${colors.yellow}Cancelling job: ${jobId}${colors.reset}`);
            await cancelVectorization(jobId);
            console.log(`${colors.yellow}Cancellation request sent${colors.reset}`);
            cancelRequested = true;
          } catch (error) {
            console.error(`${colors.red}Failed to cancel job: ${error.message}${colors.reset}`);
          }
        } else if (!cancelRequested) {
          setTimeout(cancelPrompt, 0);
        }
      });
    };
    
    // Start the cancel prompt in the background
    setTimeout(cancelPrompt, 0);
    
    // Poll for job status
    try {
      const finalStatus = await pollJobStatus(jobId);
      console.log(`${colors.green}Vectorization completed:${colors.reset}`);
      console.log(JSON.stringify(finalStatus, null, 2));
    } catch (error) {
      console.error(`${colors.red}Vectorization failed: ${error.message}${colors.reset}`);
    }
    
    // Get vector info for the project
    try {
      console.log(`${colors.cyan}Getting vector information...${colors.reset}`);
      const vectorInfo = await apiRequest('get', `/vectorize/info/${jobId}`);
      console.log(`${colors.green}Vector information:${colors.reset}`);
      console.log(JSON.stringify(vectorInfo, null, 2));
    } catch (error) {
      console.error(`${colors.red}Failed to get vector information: ${error.message}${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Test error: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

// Run the main function
main().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
}); 