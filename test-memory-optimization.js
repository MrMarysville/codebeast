/**
 * Memory Optimization Test Script
 * 
 * This script tests the memory optimization features during vectorization
 * by processing large codebases with and without memory optimization enabled.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration
const API_URL = 'http://localhost:5001/api';
const TEST_REPO_URL = 'https://github.com/facebook/react.git';
const TEST_REPO_PATH = path.join(__dirname, 'test-repos', 'react');
const RESULTS_DIR = path.join(__dirname, 'test-results');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'test-repos'))) {
  fs.mkdirSync(path.join(__dirname, 'test-repos'), { recursive: true });
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Utility to format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Get memory usage at given point
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: formatBytes(usage.rss),
    heapTotal: formatBytes(usage.heapTotal),
    heapUsed: formatBytes(usage.heapUsed),
    external: formatBytes(usage.external),
    raw: {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external
    }
  };
}

// Helper to write test results
function writeResults(testName, results) {
  const filePath = path.join(RESULTS_DIR, `${testName}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${filePath}`);
}

// Helper to monitor job status
async function monitorJob(jobId) {
  let status = 'processing';
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes
  
  console.log(`\nMonitoring job ${jobId}...`);
  
  while (status === 'processing' || status === 'retry-scheduled') {
    try {
      const response = await axios.get(`${API_URL}/vectorize/status/${jobId}`);
      status = response.data.status;
      
      // Print progress
      if (response.data.stats && typeof response.data.stats.progress === 'number') {
        process.stdout.write(`\rProgress: ${response.data.stats.progress}%`);
      } else {
        process.stdout.write(`\rStatus: ${status}`);
      }
      
      if (status === 'completed' || status === 'failed') {
        console.log(`\nJob ${jobId} finished with status: ${status}`);
        return response.data;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`\nError checking job status: ${error.message}`);
      attempts++;
      
      if (attempts >= maxAttempts) {
        console.error("Max attempts reached, giving up");
        return { status: 'timeout', error: 'Max monitoring attempts reached' };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\nJob ${jobId} finished with status: ${status}`);
  return { status };
}

// Test running vectorization with memory optimization
async function testWithMemoryOptimization() {
  console.log('\n=== Testing Vectorization WITH Memory Optimization ===');
  const startMemory = getMemoryUsage();
  console.log('Starting memory usage:', startMemory);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/vectorize/project`, {
      projectPath: TEST_REPO_PATH,
      memoryOptimized: true,
      maxRetries: 2,
      fileTypes: ['js', 'jsx', 'ts', 'tsx']
    });
    
    const jobId = response.data.jobId;
    console.log(`Started job with ID: ${jobId}`);
    
    const jobResult = await monitorJob(jobId);
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    
    console.log('Ending memory usage:', endMemory);
    console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
    
    const results = {
      testName: 'with-memory-optimization',
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: endTime - startTime,
      startMemory,
      endMemory,
      memoryDelta: {
        rss: endMemory.raw.rss - startMemory.raw.rss,
        heapUsed: endMemory.raw.heapUsed - startMemory.raw.heapUsed
      },
      jobResult
    };
    
    writeResults('with-memory-optimization', results);
    return results;
    
  } catch (error) {
    console.error('Error during test:', error.message);
    return {
      testName: 'with-memory-optimization',
      error: error.message,
      startMemory
    };
  }
}

// Test running vectorization without memory optimization
async function testWithoutMemoryOptimization() {
  console.log('\n=== Testing Vectorization WITHOUT Memory Optimization ===');
  const startMemory = getMemoryUsage();
  console.log('Starting memory usage:', startMemory);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/vectorize/project`, {
      projectPath: TEST_REPO_PATH,
      memoryOptimized: false,
      maxRetries: 2,
      fileTypes: ['js', 'jsx', 'ts', 'tsx']
    });
    
    const jobId = response.data.jobId;
    console.log(`Started job with ID: ${jobId}`);
    
    const jobResult = await monitorJob(jobId);
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    
    console.log('Ending memory usage:', endMemory);
    console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
    
    const results = {
      testName: 'without-memory-optimization',
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: endTime - startTime,
      startMemory,
      endMemory,
      memoryDelta: {
        rss: endMemory.raw.rss - startMemory.raw.rss,
        heapUsed: endMemory.raw.heapUsed - startMemory.raw.heapUsed
      },
      jobResult
    };
    
    writeResults('without-memory-optimization', results);
    return results;
    
  } catch (error) {
    console.error('Error during test:', error.message);
    return {
      testName: 'without-memory-optimization',
      error: error.message,
      startMemory
    };
  }
}

// Clone the test repository if it doesn't exist
async function cloneTestRepo() {
  if (!fs.existsSync(TEST_REPO_PATH)) {
    console.log(`Cloning test repository ${TEST_REPO_URL} to ${TEST_REPO_PATH}...`);
    try {
      await exec(`git clone ${TEST_REPO_URL} ${TEST_REPO_PATH} --depth 1`);
      console.log('Repository cloned successfully');
    } catch (error) {
      console.error('Error cloning repository:', error.message);
      process.exit(1);
    }
  } else {
    console.log(`Test repository already exists at ${TEST_REPO_PATH}`);
  }
}

// Main test function
async function runTests() {
  try {
    console.log('=== Memory Optimization Test Script ===');
    
    // Check if server is running
    try {
      await axios.get(`${API_URL}/health`);
    } catch (error) {
      console.error(`Error: Backend server not running at ${API_URL}`);
      console.error('Please start the server before running this test script');
      process.exit(1);
    }
    
    // Prepare test repository
    await cloneTestRepo();
    
    // Run tests
    const withMemOptResults = await testWithMemoryOptimization();
    
    // Wait a bit to let system stabilize
    console.log('\nWaiting 10 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const withoutMemOptResults = await testWithoutMemoryOptimization();
    
    // Compare results
    console.log('\n=== Test Results Comparison ===');
    console.log(`WITH memory optimization: ${withMemOptResults.duration / 1000} seconds`);
    console.log(`WITHOUT memory optimization: ${withoutMemOptResults.duration / 1000} seconds`);
    
    if (withMemOptResults.jobResult && withoutMemOptResults.jobResult) {
      // Memory usage comparison
      console.log('\n=== Memory Usage Comparison ===');
      
      const withOptPeak = withMemOptResults.jobResult.stats?.peakMemoryUsage || 'N/A';
      const withoutOptPeak = withoutMemOptResults.jobResult.stats?.peakMemoryUsage || 'N/A';
      
      console.log(`WITH memory optimization peak: ${withOptPeak}%`);
      console.log(`WITHOUT memory optimization peak: ${withoutOptPeak}%`);
      
      // Create comparison results
      const comparison = {
        timestamp: new Date().toISOString(),
        withMemoryOptimization: {
          duration: withMemOptResults.duration,
          peakMemoryUsage: withOptPeak,
          filesProcessed: withMemOptResults.jobResult.stats?.filesProcessed || 0,
          status: withMemOptResults.jobResult.status
        },
        withoutMemoryOptimization: {
          duration: withoutMemOptResults.duration,
          peakMemoryUsage: withoutOptPeak,
          filesProcessed: withoutMemOptResults.jobResult.stats?.filesProcessed || 0,
          status: withoutMemOptResults.jobResult.status
        },
        comparison: {
          durationDifference: withoutMemOptResults.duration - withMemOptResults.duration,
          durationDifferencePercent: ((withoutMemOptResults.duration - withMemOptResults.duration) / withoutMemOptResults.duration) * 100
        }
      };
      
      writeResults('comparison', comparison);
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 