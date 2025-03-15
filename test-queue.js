/**
 * Testing script for the processing queue functionality
 * 
 * Run with: node test-queue.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5001/api';
const TEST_PROJECTS = [
  { 
    path: path.resolve('./backend'), 
    fileTypes: ['js'], 
    memoryOptimized: true,
    priority: 1,
    description: 'Backend (high priority)'
  },
  { 
    path: path.resolve('./frontend'), 
    fileTypes: ['js', 'jsx', 'css'],
    memoryOptimized: true,
    priority: 0, 
    description: 'Frontend (normal priority)'
  },
  { 
    path: path.resolve('./'), 
    fileTypes: ['*'],
    memoryOptimized: true,
    priority: 2,
    description: 'All files (highest priority)'
  }
];

// Store job IDs
const jobs = [];

// Main test function
async function runQueueTest() {
  console.log('=== Processing Queue Test ===');
  
  try {
    // 1. Submit multiple jobs
    console.log('Submitting test jobs...');
    for (const project of TEST_PROJECTS) {
      try {
        const response = await axios.post(`${API_URL}/vectorize/project`, {
          projectPath: project.path,
          fileTypes: project.fileTypes,
          memoryOptimized: project.memoryOptimized,
          priority: project.priority
        });
        
        const jobId = response.data.jobId;
        jobs.push({
          id: jobId,
          description: project.description,
          priority: project.priority
        });
        
        console.log(`✅ Job submitted: ${jobId} - ${project.description} (Priority: ${project.priority})`);
      } catch (error) {
        console.error(`❌ Failed to submit job for ${project.description}: ${error.message}`);
      }
    }
    
    // 2. Check queue status
    await checkQueueStatus();
    
    // 3. Cancel one job
    if (jobs.length > 0) {
      const jobToCancel = jobs[jobs.length - 1];
      try {
        const response = await axios.post(`${API_URL}/vectorize/queue/${jobToCancel.id}/cancel`);
        if (response.data.success) {
          console.log(`✅ Successfully cancelled job: ${jobToCancel.id} - ${jobToCancel.description}`);
        } else {
          console.log(`⚠️ Could not cancel job: ${jobToCancel.id} - ${response.data.message}`);
        }
      } catch (error) {
        console.error(`❌ Error when cancelling job: ${error.message}`);
      }
    }
    
    // 4. Check queue status again
    await checkQueueStatus();
    
    // 5. Monitor jobs until completed or 2 minutes passed
    await monitorJobs();
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Check queue status
async function checkQueueStatus() {
  try {
    console.log('\nChecking queue status...');
    const response = await axios.get(`${API_URL}/vectorize/queue`);
    
    const { status, activeTasks, queuedTasks } = response.data;
    
    console.log('Queue Status:');
    console.log(`- Active tasks: ${status.activeTasks}`);
    console.log(`- Queued tasks: ${status.queuedTasks}`);
    console.log(`- Memory usage: ${status.memoryUsage}%`);
    
    console.log('\nActive Tasks:');
    activeTasks.forEach(task => {
      console.log(`- ${task.id} (Priority: ${task.priority}, Memory: ${task.estimatedMemoryMB}MB)`);
    });
    
    console.log('\nQueued Tasks:');
    queuedTasks.forEach(task => {
      console.log(`- ${task.id} (Priority: ${task.priority}, Memory: ${task.estimatedMemoryMB}MB)`);
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to check queue status:', error.message);
    return null;
  }
}

// Monitor jobs until completion or timeout
async function monitorJobs() {
  console.log('\nMonitoring jobs...');
  const remainingJobs = [...jobs];
  
  // Remove the cancelled job
  if (remainingJobs.length > 0) {
    remainingJobs.pop();
  }
  
  const startTime = Date.now();
  const timeoutMs = 2 * 60 * 1000; // 2 minutes
  
  while (remainingJobs.length > 0 && (Date.now() - startTime) < timeoutMs) {
    for (let i = remainingJobs.length - 1; i >= 0; i--) {
      const job = remainingJobs[i];
      
      try {
        const response = await axios.get(`${API_URL}/vectorize/job/${job.id}`);
        const jobStatus = response.data;
        
        if (['completed', 'failed', 'cancelled'].includes(jobStatus.status)) {
          console.log(`✅ Job ${job.id} finished with status: ${jobStatus.status}`);
          
          if (jobStatus.stats) {
            console.log(`   - Files processed: ${jobStatus.stats.filesProcessed}`);
            console.log(`   - Errors: ${jobStatus.stats.errors}`);
            console.log(`   - Retries: ${jobStatus.stats.retries || 0}`);
            
            if (jobStatus.stats.peakMemoryUsage) {
              console.log(`   - Peak memory usage: ${jobStatus.stats.peakMemoryUsage}%`);
            }
          }
          
          remainingJobs.splice(i, 1);
        } else {
          const progress = jobStatus.stats?.progress || 0;
          console.log(`⏳ Job ${job.id} is ${jobStatus.status} (Progress: ${progress}%)`);
        }
      } catch (error) {
        console.log(`⚠️ Could not check status for job ${job.id}: ${error.message}`);
      }
    }
    
    if (remainingJobs.length > 0) {
      console.log(`\nWaiting 5 seconds... (${remainingJobs.length} jobs remaining)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  if (remainingJobs.length > 0) {
    console.log('\n⚠️ Monitoring timed out with jobs still running:');
    for (const job of remainingJobs) {
      console.log(`- ${job.id} (${job.description})`);
    }
  } else {
    console.log('\n✅ All jobs completed!');
  }
}

// Run the test
runQueueTest().catch(error => {
  console.error('Test error:', error);
}); 