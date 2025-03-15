/**
 * Enhanced Vectorization Controller
 * 
 * Provides improved vectorization workflow for folder codebases with:
 * - Robust error handling
 * - Detailed status tracking
 * - Progress reporting
 * - Optimized performance
 * - Graceful cancellation
 */
const path = require('path');
const fs = require('fs-extra');
const { runPythonScript, killAllPythonProcesses } = require('../utils/pythonRunner');
const logger = require('../utils/logger');
const shutdownHandler = require('../utils/shutdownHandler');
const jobRetry = require('../utils/jobRetry');
const memoryProfiler = require('../utils/memoryProfiler');
const { v4: uuidv4 } = require('uuid');
const { Job } = require('../models/job');
const PLimit = require('p-limit');
const processingQueue = require('../utils/processingQueue');
const os = require('os');

// Store active vectorization jobs
const activeJobs = new Map();

/**
 * Get the status of a vectorization job
 * 
 * @param {string} jobId - The ID of the job to check
 * @returns {object} - The status of the job
 */
const getVectorizationStatus = (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }
    
    logger.info(`Getting vectorization status for job: ${jobId}`);
    
    // Check if job exists
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        message: `No vectorization job found with ID: ${jobId}`
      });
    }
    
    const job = activeJobs.get(jobId);
    
    // Add retry information if available
    const retryInfo = jobRetry.getRetryInfo(jobId);
    
    return res.status(200).json({
      success: true,
      jobId,
      status: job.status,
      progress: job.progress,
      startTime: job.startTime,
      elapsedTimeMs: Date.now() - job.startTime,
      filesProcessed: job.filesProcessed,
      filesTotal: job.filesTotal,
      lastUpdated: job.lastUpdated,
      error: job.error,
      retryInfo: retryInfo
    });
  } catch (error) {
    logger.error('Error getting vectorization status', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Error getting vectorization status',
      error: error.message
    });
  }
};

/**
 * Cancel a vectorization job
 * 
 * @param {string} jobId - The ID of the job to cancel
 * @returns {object} - The result of the cancellation
 */
const cancelVectorization = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }
    
    logger.info(`Cancelling vectorization job: ${jobId}`);
    
    // Check if job exists
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        message: `No vectorization job found with ID: ${jobId}`
      });
    }
    
    const job = activeJobs.get(jobId);
    
    // Update job status
    job.status = 'cancelled';
    job.lastUpdated = Date.now();
    activeJobs.set(jobId, job);
    
    // Cancel any pending retries
    jobRetry.cancelRetries(jobId);
    
    // Kill any Python processes
    await killAllPythonProcesses();
    
    // Clean up any temporary files
    const tmpDir = path.join(__dirname, '..', 'uploads', 'tmp', jobId);
    if (await fs.pathExists(tmpDir)) {
      await fs.remove(tmpDir);
    }
    
    logger.info(`Vectorization job cancelled: ${jobId}`);
    
    // Remove the job after a delay to allow for status checking
    setTimeout(() => {
      if (activeJobs.has(jobId)) {
        activeJobs.delete(jobId);
      }
    }, 60000); // Remove after 1 minute
    
    return res.status(200).json({
      success: true,
      message: 'Vectorization job cancelled successfully',
      jobId
    });
  } catch (error) {
    logger.error('Error cancelling vectorization job', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Error cancelling vectorization job',
      error: error.message
    });
  }
};

/**
 * Clean up old vectorization jobs
 */
const cleanupOldJobs = () => {
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [jobId, job] of activeJobs.entries()) {
    // Remove jobs that are completed, failed, or cancelled and older than maxAge
    if (['completed', 'failed', 'cancelled'].includes(job.status) && (now - job.lastUpdated > maxAgeMs)) {
      logger.info(`Cleaning up old vectorization job: ${jobId}`);
      activeJobs.delete(jobId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupOldJobs, 60 * 60 * 1000);

/**
 * Create a job status entry
 * 
 * @param {string} uploadPath - Path to the uploaded files
 * @returns {string} - The job ID
 */
const createJob = (uploadPath) => {
  const jobId = `vecjob-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  activeJobs.set(jobId, {
    id: jobId,
    uploadPath,
    status: 'created',
    progress: 0,
    filesProcessed: 0,
    filesTotal: 0,
    startTime: Date.now(),
    lastUpdated: Date.now(),
    error: null
  });
  
  return jobId;
};

/**
 * Update job status
 * 
 * @param {string} jobId - The ID of the job to update
 * @param {object} updates - The updates to apply
 */
const updateJob = (jobId, updates) => {
  if (!activeJobs.has(jobId)) {
    return;
  }
  
  const job = activeJobs.get(jobId);
  
  activeJobs.set(jobId, {
    ...job,
    ...updates,
    lastUpdated: Date.now()
  });
};

/**
 * Count the number of files in a directory based on file types
 * 
 * @param {string} dirPath - Directory path
 * @param {Array<string>} fileTypes - File types to include (empty for all)
 * @returns {Promise<number>} - Number of files
 */
async function countFiles(dirPath, fileTypes = []) {
  return new Promise((resolve, reject) => {
    let count = 0;
    
    try {
      // Function to check if a file should be included based on its extension
      const shouldIncludeFile = (file) => {
        if (!fileTypes || !fileTypes.length || fileTypes.includes('*')) {
          return true;
        }
        
        const ext = path.extname(file).slice(1).toLowerCase();
        return fileTypes.includes(ext);
      };
      
      // Function to recursively count files
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            // Skip node_modules and .git directories
            if (file !== 'node_modules' && file !== '.git') {
              walkDir(filePath);
            }
          } else if (stat.isFile() && shouldIncludeFile(file)) {
            count++;
          }
        }
      };
      
      // Start counting
      walkDir(dirPath);
      resolve(count);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Estimate memory requirements for vectorizing a project
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const estimateMemoryRequirements = async (req, res) => {
  try {
    const { projectPath, fileTypes } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        success: false,
        message: 'Project path is required'
      });
    }
    
    // Check if project path exists
    if (!fs.existsSync(projectPath)) {
      return res.status(400).json({
        success: false,
        message: 'Project path does not exist'
      });
    }
    
    // Count files
    const fileCount = await countFiles(projectPath, fileTypes);
    
    // Estimate memory requirements (these are rough estimates based on file count)
    const standardEstimateInMB = Math.min(2000, 200 + (fileCount * 2));
    const optimizedEstimateInMB = Math.min(500, 100 + (fileCount * 0.2));
    
    // Determine if memory optimization is recommended based on system memory
    const totalSystemMemoryMB = os.totalmem() / (1024 * 1024);
    const memoryThresholdPercentage = 0.7; // 70% of system memory
    const memoryThresholdMB = totalSystemMemoryMB * memoryThresholdPercentage;
    
    const optimizationRecommended = standardEstimateInMB > memoryThresholdMB;
    
    res.status(200).json({
      success: true,
      estimates: {
        fileCount,
        standard: {
          memoryMB: standardEstimateInMB,
          recommendedBatchSize: Math.ceil(fileCount / 5)
        },
        optimized: {
          memoryMB: optimizedEstimateInMB,
          recommendedBatchSize: Math.ceil(fileCount / 20)
        }
      },
      system: {
        totalMemoryMB: Math.floor(totalSystemMemoryMB),
        availableMemoryMB: Math.floor(os.freemem() / (1024 * 1024)),
        cpuCores: os.cpus().length
      },
      recommendation: {
        useOptimization: optimizationRecommended,
        reason: optimizationRecommended ? 
          'Standard processing may exceed available memory' : 
          'Standard processing should work with available memory'
      }
    });
  } catch (error) {
    logger.error(`Error estimating memory requirements: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error estimating memory requirements',
      error: error.message
    });
  }
};

/**
 * Group files into batches for memory-efficient processing
 * 
 * @param {string} dir - The directory to scan
 * @param {Array} extensions - File extensions to include
 * @param {number} batchSize - Number of files per batch
 * @returns {Promise<Array<Array<string>>>} - Array of file path batches
 */
const getFileBatches = async (dir, extensions = null, batchSize = 50) => {
  try {
    const allFiles = [];
    
    // Helper function to recursively collect files
    const collectFiles = async (directory) => {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and hidden directories
          if (file === 'node_modules' || file.startsWith('.')) continue;
          await collectFiles(filePath);
        } else if (!extensions || extensions.includes(path.extname(file).toLowerCase())) {
          allFiles.push(filePath);
        }
      }
    };
    
    await collectFiles(dir);
    
    // Group files into batches
    const batches = [];
    for (let i = 0; i < allFiles.length; i += batchSize) {
      batches.push(allFiles.slice(i, i + batchSize));
    }
    
    return batches;
  } catch (error) {
    logger.error('Error creating file batches', { dir, error: error.message });
    return [];
  }
};

/**
 * Process a batch of files for vectorization
 * 
 * @param {Array<string>} fileBatch - Batch of file paths
 * @param {string} outputDir - Directory to save vectors
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} - Processing results
 */
const processFileBatch = async (fileBatch, outputDir, jobId) => {
  try {
    // Create a temporary batch file
    const batchFile = path.join(__dirname, '..', 'uploads', 'tmp', `batch-${jobId}-${Date.now()}.json`);
    await fs.writeJson(batchFile, { files: fileBatch });
    
    // Process the batch
    const result = await runPythonScript('process_batch.py', [
      batchFile,
      outputDir,
      '--job-id', jobId
    ]);
    
    // Clean up the batch file
    await fs.remove(batchFile);
    
    return JSON.parse(result);
  } catch (error) {
    logger.error('Error processing file batch', { jobId, error: error.message });
    throw error;
  }
};

/**
 * Retry a failed vectorization job
 * 
 * @param {string} jobId - The job ID to retry
 * @param {number} retryCount - The current retry count
 * @param {Error} error - The error that caused the failure
 * @returns {Promise<void>}
 */
const retryVectorization = async (jobId, retryCount, error) => {
  try {
    // Check if job still exists
    if (!activeJobs.has(jobId)) {
      throw new Error(`Job ${jobId} no longer exists, cannot retry`);
    }
    
    const job = activeJobs.get(jobId);
    const { uploadPath } = job;
    
    logger.info(`Retrying vectorization job ${jobId} (attempt ${retryCount})`, {
      originalError: error.message
    });
    
    // Determine if we should use memory-optimized approach based on previous failure
    const useMemoryOptimized = error.message.includes('memory') || 
                               error.message.includes('allocation') ||
                               error.message.includes('heap') ||
                               retryCount > 1;
    
    const smallerBatchSize = Math.max(10, Math.floor(50 / (retryCount + 1)));
    
    // Update job status
    updateJob(jobId, {
      status: 'retrying',
      retryCount,
      error: null
    });
    
    // Restart vectorization with memory-optimized settings if needed
    const processId = `vectorize-retry-${jobId}-${retryCount}`;
    shutdownHandler.registerProcess(processId);
    
    try {
      // Create a new progress file
      const progressFile = path.join(__dirname, '..', 'uploads', 'tmp', `progress-retry-${jobId}-${retryCount}.json`);
      await fs.writeJson(progressFile, {
        status: 'retrying',
        progress: 0,
        filesProcessed: 0,
        filesTotal: job.filesTotal || 0,
        retryCount
      });
      
      // Re-create the vector directory
      const outputDir = path.join(__dirname, '..', 'uploads', 'vectors', jobId);
      await fs.ensureDir(outputDir);
      
      // Start vectorization based on memory requirements
      if (useMemoryOptimized) {
        logger.info(`Using memory-optimized approach for retry ${retryCount} of job ${jobId}`, { 
          batchSize: smallerBatchSize
        });
        
        // Get file batches with smaller batch size for retries
        const batches = await getFileBatches(uploadPath, null, smallerBatchSize);
        const totalBatches = batches.length;
        
        logger.info(`Divided into ${totalBatches} batches for retry`, { jobId, retryCount });
        
        let filesProcessed = 0;
        let batchesProcessed = 0;
        let combinedResults = {
          success: true,
          files_processed: 0,
          vectors_created: 0,
          languages_detected: new Set(),
          batches_processed: 0,
          retry_count: retryCount
        };
        
        // Process each batch with more conservative settings
        for (const batch of batches) {
          if (activeJobs.get(jobId).status === 'cancelled') {
            logger.info(`Job ${jobId} was cancelled during retry - stopping`);
            break;
          }
          
          // Add a slight delay between batches to reduce memory pressure
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const batchResult = await processFileBatch(batch, outputDir, jobId);
          
          if (batchResult.success) {
            filesProcessed += batch.length;
            batchesProcessed++;
            
            // Update combined results
            combinedResults.files_processed += batchResult.files_processed;
            combinedResults.vectors_created += batchResult.vectors_created;
            
            if (batchResult.languages_detected) {
              batchResult.languages_detected.forEach(lang => 
                combinedResults.languages_detected.add(lang)
              );
            }
            
            combinedResults.batches_processed = batchesProcessed;
            
            // Update progress
            const progress = Math.floor((filesProcessed / job.filesTotal) * 100);
            await fs.writeJson(progressFile, {
              status: 'vectorizing',
              progress,
              filesProcessed,
              filesTotal: job.filesTotal,
              batchesProcessed,
              totalBatches,
              retryCount
            });
          } else {
            logger.error(`Batch processing failed during retry of job ${jobId}`, batchResult);
            throw new Error(batchResult.message || 'Batch processing failed during retry');
          }
        }
        
        // Convert Set to Array for languages
        combinedResults.languages_detected = Array.from(combinedResults.languages_detected);
        
        // Final update
        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          filesProcessed: job.filesTotal,
          result: combinedResults,
          retryCount
        });
        
        logger.info(`Retry ${retryCount} vectorization completed for job: ${jobId}`, combinedResults);
      } else {
        // Use standard approach but with more conservative settings
        const scriptName = 'enhanced_vectorize.py';
        
        const args = [
          uploadPath,
          outputDir,
          '--job-id', jobId,
          '--progress-file', progressFile,
          '--memory-limit', '70',  // Use 70% of available memory
          '--batch-size', '20'     // Smaller batch size
        ];
        
        logger.info(`Executing Python script for retry: ${scriptName}`, { args, retryCount });
        
        const result = await runPythonScript(scriptName, args);
        const parsedResult = JSON.parse(result);
        
        if (parsedResult.success) {
          updateJob(jobId, {
            status: 'completed',
            progress: 100,
            filesProcessed: job.filesTotal,
            result: parsedResult,
            retryCount
          });
          
          logger.info(`Retry ${retryCount} vectorization completed for job: ${jobId}`, parsedResult);
        } else {
          throw new Error(parsedResult.message || 'Vectorization retry failed');
        }
      }
      
      // Remove the progress file
      if (await fs.pathExists(progressFile)) {
        await fs.remove(progressFile);
      }
      
    } catch (retryError) {
      // Update job status with the new error
      updateJob(jobId, {
        status: 'failed',
        error: retryError.message,
        retryCount
      });
      
      logger.error(`Retry ${retryCount} failed for job: ${jobId}`, { error: retryError.message });
      throw retryError;
    } finally {
      shutdownHandler.unregisterProcess(processId);
    }
  } catch (error) {
    logger.error(`Error during vectorization retry for job: ${jobId}`, { 
      error: error.message,
      retryCount
    });
    throw error;
  }
};

/**
 * Submit a vectorization task to the processing queue
 * 
 * @param {Object} options - Task options
 * @param {string} options.jobId - Job ID
 * @param {string} options.projectPath - Project path
 * @param {boolean} options.memoryOptimized - Whether to use memory optimization
 * @param {Array} options.fileTypes - File types to process
 * @returns {Promise<Object>} - Task result
 */
async function queueVectorizationTask(options) {
  const { jobId, projectPath, memoryOptimized = true, fileTypes = [] } = options;
  
  logger.info(`Queueing vectorization task for job ${jobId}`, { jobId, projectPath });
  
  // Get file count to estimate memory requirements
  const fileCount = await countFiles(projectPath, fileTypes);
  
  // Calculate estimated memory based on file count
  // This is a rough estimate - adjust based on your application's needs
  const estimatedMemoryMB = memoryOptimized ? 
    Math.min(500, 100 + (fileCount * 0.2)) : // Lower for memory-optimized
    Math.min(2000, 200 + (fileCount * 2));   // Higher for standard
  
  // Create task
  const task = {
    id: jobId,
    process: async (data) => {
      // Set up memory profiling
      memoryProfiler.startMonitoring({
        jobId,
        sampleInterval: 10000,
        logToConsole: process.env.NODE_ENV !== 'production'
      });
      
      try {
        // Process the project
        if (memoryOptimized) {
          await processProjectWithMemoryOptimization(jobId, projectPath, fileTypes);
        } else {
          await processProject(jobId, projectPath, fileTypes);
        }
        
        // Update job status
        const job = await Job.findById(jobId);
        if (job) {
          job.status = 'completed';
          job.endTime = new Date();
          job.completionTime = job.endTime - job.startTime;
          await job.save();
        }
        
        return { success: true };
      } finally {
        // Stop memory profiling
        const memoryResults = memoryProfiler.stopMonitoring();
        if (memoryResults) {
          logger.info(`Memory profiling results for job ${jobId}: Peak usage ${memoryResults.peakMemoryUsage}%`, {
            jobId,
            peakMemoryUsage: memoryResults.peakMemoryUsage,
            avgMemoryUsage: memoryResults.summary.system.avgUsedPercentage
          });
          
          // Update job with memory metrics
          await Job.findOneAndUpdate(
            { jobId },
            { 
              $set: { 
                'stats.peakMemoryUsage': memoryResults.peakMemoryUsage,
                'stats.avgMemoryUsage': memoryResults.summary.system.avgUsedPercentage,
                'stats.memoryMetricsFile': memoryResults.metricsFile
              }
            }
          );
        }
      }
    },
    data: options,
    priority: options.priority || 0,
    estimatedMemoryMB
  };
  
  // Add task to queue
  processingQueue.addTask(task);
  
  // Return task info
  return {
    jobId,
    queued: true,
    estimatedMemoryMB,
    fileCount
  };
}

/**
 * Vectorize a project
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const vectorizeProject = async (req, res) => {
  try {
    const { projectPath, memoryOptimized = true, fileTypes, maxRetries = 3, priority = 0 } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({ success: false, message: 'Project path is required' });
    }

    const jobId = uuidv4();
    logger.info(`Starting vectorization job ${jobId} for project: ${projectPath}`, { jobId });
    
    // Register job with retry mechanism
    jobRetry.registerJob(jobId, {
      maxRetries,
      retryFn: async (retryCount) => {
        logger.info(`Attempting retry #${retryCount} for job ${jobId}`, { jobId, retryCount });
        return await queueVectorizationTask({
          jobId,
          projectPath,
          memoryOptimized,
          fileTypes,
          priority: priority + 1 // Increase priority for retries
        });
      }
    });
    
    // Validate project path
    if (!fs.existsSync(projectPath)) {
      logger.error(`Project path does not exist: ${projectPath}`, { jobId });
      return res.status(400).json({ 
        success: false, 
        message: 'Project path does not exist' 
      });
    }
    
    // Create a new job
    const job = new Job({
      jobId,
      status: 'queued',
      type: 'vectorization',
      projectPath,
      startTime: new Date(),
      stats: {
        filesProcessed: 0,
        errors: 0,
        retries: 0,
        progress: 0
      },
      options: {
        memoryOptimized,
        fileTypes: Array.isArray(fileTypes) ? fileTypes : [],
        maxRetries
      }
    });
    
    await job.save();
    
    // Queue the vectorization task
    await queueVectorizationTask({
      jobId,
      projectPath,
      memoryOptimized,
      fileTypes,
      priority
    });
    
    // Respond to client immediately
    res.status(202).json({ 
      success: true, 
      message: 'Vectorization queued', 
      jobId,
      status: 'queued',
      queueStatus: processingQueue.getQueueStatus()
    });
    
    // Set up event listener for task failures
    const failureHandler = async (task, error) => {
      if (task.id === jobId) {
        logger.error(`Task failed for job ${jobId}: ${error.message}`, { 
          jobId, 
          error: error.stack 
        });
        
        // Check if we should retry
        const shouldRetry = await jobRetry.shouldRetryJob(jobId);
        
        if (shouldRetry) {
          // Update retry count
          await Job.findOneAndUpdate(
            { jobId },
            { 
              $set: { status: 'retry-scheduled' },
              $inc: { 'stats.retries': 1 },
              $push: { logs: `Scheduled retry due to error: ${error.message}` }
            }
          );
          
          // The retry will be handled by the jobRetry utility
        } else {
          // Mark job as failed
          const job = await Job.findById(jobId);
          if (job) {
            job.status = 'failed';
            job.error = error.message;
            job.endTime = new Date();
            job.completionTime = job.endTime - job.startTime;
            await job.save();
          }
        }
        
        // Remove the event listener
        processingQueue.events.removeListener('task-failed', failureHandler);
      }
    };
    
    // Listen for task failures
    processingQueue.events.on('task-failed', failureHandler);
    
  } catch (error) {
    logger.error(`Unexpected error in vectorizeProject: ${error.message}`, { error: error.stack });
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during vectorization initialization',
      error: error.message
    });
  }
};

/**
 * Get vectorization job statistics
 */
const getVectorizationStats = (req, res) => {
  try {
    const stats = {
      total: activeJobs.size,
      statusCounts: {
        created: 0,
        counting_files: 0,
        preparing: 0,
        vectorizing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        retry_scheduled: 0,
        retrying: 0
      },
      jobs: [],
      retryStats: jobRetry.getRetryStats()
    };
    
    // Count jobs by status
    for (const [jobId, job] of activeJobs.entries()) {
      if (stats.statusCounts[job.status] !== undefined) {
        stats.statusCounts[job.status]++;
      }
      
      // Add basic job info to list
      stats.jobs.push({
        id: jobId,
        status: job.status,
        progress: job.progress,
        startTime: job.startTime,
        lastUpdated: job.lastUpdated,
        filesProcessed: job.filesProcessed,
        filesTotal: job.filesTotal
      });
    }
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error getting vectorization stats', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Error getting vectorization stats',
      error: error.message
    });
  }
};

/**
 * Get information about vectors for a project
 */
const getVectorInfo = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    logger.info(`Getting vector info for project: ${projectId}`);
    
    // Check if vectors exist for this project
    const vectorDir = path.join(__dirname, '..', 'uploads', 'vectors', projectId);
    
    if (!await fs.pathExists(vectorDir)) {
      return res.status(404).json({
        success: false,
        message: `No vectors found for project: ${projectId}`
      });
    }
    
    // Call the Python script to get vector info
    const result = await runPythonScript('get_vector_info.py', [vectorDir]);
    const parsedResult = JSON.parse(result);
    
    if (parsedResult.success) {
      return res.status(200).json({
        success: true,
        ...parsedResult
      });
    } else {
      return res.status(500).json({
        success: false,
        message: parsedResult.message || 'Failed to get vector information'
      });
    }
  } catch (error) {
    logger.error('Error getting vector info', { error: error.message });
    
    return res.status(500).json({
      success: false,
      message: 'Error getting vector information',
      error: error.message
    });
  }
};

/**
 * Process a project with memory optimization
 * @param {String} jobId The vectorization job ID
 * @param {String} projectPath Path to the project to vectorize
 * @param {Array} fileTypes Optional array of file extensions to include
 */
async function processProjectWithMemoryOptimization(jobId, projectPath, fileTypes = []) {
  logger.info(`Starting memory-optimized processing for job ${jobId}`, { jobId });
  
  // Get all files in the project
  let files = await getProjectFiles(projectPath, fileTypes);
  const totalFiles = files.length;
  
  if (totalFiles === 0) {
    logger.warn(`No files found in project: ${projectPath} with file types: ${fileTypes?.join(', ') || 'all'}`, { jobId });
    return;
  }
  
  logger.info(`Found ${totalFiles} files to process for job ${jobId}`, { jobId });
  
  // Calculate total size and average file size
  let totalSize = 0;
  for (const file of files) {
    const stats = fs.statSync(file);
    totalSize += stats.size;
  }
  
  const averageFileSize = totalSize / totalFiles;
  
  // Estimate memory requirements and calculate optimal batch size
  const memoryPerFile = memoryProfiler.estimateMemoryRequirement({
    operation: 'vectorization',
    fileCount: 1,
    totalSizeBytes: averageFileSize,
    averageFileSizeBytes: averageFileSize
  });
  
  // Get recommended batch size based on available memory
  let batchSize = memoryProfiler.recommendBatchSize(totalFiles, memoryPerFile);
  
  // Ensure minimum batch size
  batchSize = Math.max(5, Math.min(batchSize, 100));
  
  logger.info(`Memory-optimized processing: Using batch size of ${batchSize} for ${totalFiles} files`, { 
    jobId, 
    batchSize, 
    totalFiles,
    averageFileSize: Math.round(averageFileSize / 1024) + 'KB',
    totalSize: Math.round(totalSize / (1024 * 1024)) + 'MB'
  });
  
  // Process files in batches
  let processed = 0;
  let errors = 0;
  
  while (files.length > 0) {
    // Get a batch of files
    const batch = files.splice(0, batchSize);
    
    logger.info(`Processing batch of ${batch.length} files (${processed + batch.length}/${totalFiles})`, { jobId });
    
    try {
      // Process the batch
      const results = await Promise.allSettled(
        batch.map(async (filePath) => {
          try {
            await vectorizeFile(jobId, filePath);
            return { success: true, file: filePath };
          } catch (error) {
            logger.error(`Error processing file ${filePath}: ${error.message}`, { 
              jobId, 
              file: filePath, 
              error: error.stack 
            });
            return { success: false, file: filePath, error: error.message };
          }
        })
      );
      
      // Update job stats
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      processed += successful;
      errors += failed;
      
      await Job.findOneAndUpdate(
        { jobId },
        { 
          $set: { 
            'stats.filesProcessed': processed,
            'stats.errors': errors,
            'stats.progress': Math.round((processed / totalFiles) * 100)
          }
        }
      );
      
      // Check memory usage after each batch
      const memoryStats = memoryProfiler.getMemoryStats();
      
      // If memory usage is high, reduce batch size for next batch
      if (memoryStats.system.usedPercentage > 75) {
        const newBatchSize = Math.max(2, Math.floor(batchSize * 0.8));
        
        if (newBatchSize < batchSize) {
          logger.info(`Reducing batch size from ${batchSize} to ${newBatchSize} due to high memory usage (${memoryStats.system.usedPercentage}%)`, { 
            jobId, 
            memoryUsage: memoryStats.system.usedPercentage 
          });
          
          batchSize = newBatchSize;
        }
      }
      
      // Force garbage collection if available
      if (global.gc && memoryStats.system.usedPercentage > 85) {
        logger.info(`Forcing garbage collection due to high memory usage (${memoryStats.system.usedPercentage}%)`, { 
          jobId 
        });
        global.gc();
      }
      
      // Small delay between batches to allow for other operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logger.error(`Error processing batch for job ${jobId}: ${error.message}`, { 
        jobId, 
        error: error.stack 
      });
      throw error;
    }
  }
  
  logger.info(`Memory-optimized processing completed for job ${jobId}. Processed ${processed} files with ${errors} errors`, { 
    jobId, 
    filesProcessed: processed,
    errors
  });
}

/**
 * Process a single project without memory optimization
 * (for smaller projects, faster but uses more memory)
 * @param {String} jobId The vectorization job ID
 * @param {String} projectPath Path to the project to vectorize
 * @param {Array} fileTypes Optional array of file extensions to include
 */
async function processProject(jobId, projectPath, fileTypes = []) {
  logger.info(`Starting standard processing for job ${jobId}`, { jobId });
  
  // Get all files in the project
  const files = await getProjectFiles(projectPath, fileTypes);
  const totalFiles = files.length;
  
  if (totalFiles === 0) {
    logger.warn(`No files found in project: ${projectPath} with file types: ${fileTypes?.join(', ') || 'all'}`, { jobId });
    return;
  }
  
  logger.info(`Found ${totalFiles} files to process for job ${jobId}`, { jobId });
  
  // Check if this is too many files for standard processing
  if (totalFiles > 500) {
    logger.warn(`Large project detected (${totalFiles} files). Switching to memory-optimized processing`, { jobId });
    return processProjectWithMemoryOptimization(jobId, projectPath, fileTypes);
  }
  
  let processed = 0;
  let errors = 0;
  
  // Process all files concurrently (with a reasonable limit)
  const concurrencyLimit = Math.min(totalFiles, 20);
  const limiter = new PLimit(concurrencyLimit);
  
  logger.info(`Processing files with concurrency limit of ${concurrencyLimit}`, { jobId });
  
  const results = await Promise.allSettled(
    files.map(filePath => 
      limiter(async () => {
        try {
          await vectorizeFile(jobId, filePath);
          return { success: true, file: filePath };
        } catch (error) {
          logger.error(`Error processing file ${filePath}: ${error.message}`, { 
            jobId, 
            file: filePath, 
            error: error.stack 
          });
          return { success: false, file: filePath, error: error.message };
        }
      })
    )
  );
  
  // Update job stats
  processed = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  errors = results.length - processed;
  
  await Job.findOneAndUpdate(
    { jobId },
    { 
      $set: { 
        'stats.filesProcessed': processed,
        'stats.errors': errors,
        'stats.progress': 100
      }
    }
  );
  
  logger.info(`Standard processing completed for job ${jobId}. Processed ${processed} files with ${errors} errors`, { 
    jobId, 
    filesProcessed: processed,
    errors
  });
}

/**
 * Get the processing queue status
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueStatus = (req, res) => {
  try {
    const status = processingQueue.getQueueStatus();
    
    // Add active tasks details
    const activeTasks = processingQueue.getTasks(task => task.status === 'processing');
    const queuedTasks = processingQueue.getTasks(task => task.status === 'queued');
    
    // Format tasks for response
    const formatTask = task => ({
      id: task.id,
      status: task.status,
      added: task.added,
      started: task.started,
      priority: task.priority,
      estimatedMemoryMB: task.estimatedMemoryMB,
      data: {
        projectPath: task.data.projectPath,
        memoryOptimized: task.data.memoryOptimized,
        fileTypes: task.data.fileTypes
      }
    });
    
    res.status(200).json({
      success: true,
      status,
      activeTasks: activeTasks.map(formatTask),
      queuedTasks: queuedTasks.map(formatTask).slice(0, 10) // Only return the first 10
    });
  } catch (error) {
    logger.error(`Error getting queue status: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error getting queue status',
      error: error.message
    });
  }
};

/**
 * Cancel a vectorization job in the queue
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelQueuedVectorization = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }
    
    // Try to cancel the task
    const cancelled = processingQueue.cancelTask(jobId);
    
    // If not cancelled, check if it's an active job
    if (!cancelled) {
      const job = await Job.findById(jobId);
      
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      
      // If job is active but not in the queue, it's already being processed
      if (['processing', 'queued'].includes(job.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel job that is already being processed'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Cannot cancel job with status: ${job.status}`
      });
    }
    
    // Update job status
    await Job.findOneAndUpdate(
      { jobId },
      { 
        $set: { 
          status: 'cancelled',
          endTime: new Date()
        },
        $push: { logs: 'Job cancelled by user' }
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Job cancelled successfully',
      jobId
    });
  } catch (error) {
    logger.error(`Error cancelling vectorization: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error cancelling vectorization',
      error: error.message
    });
  }
};

// Export the controllers
module.exports = { 
  vectorizeProject,
  getVectorizationStatus,
  cancelVectorization,
  getVectorizationStats,
  getVectorInfo,
  retryVectorization, // Export for testing
  queueVectorizationTask,
  getQueueStatus,
  cancelQueuedVectorization,
  estimateMemoryRequirements
}; 