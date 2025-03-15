/**
 * Job Retry Utility
 * 
 * Provides functionality for automatic retries of failed jobs
 * with exponential backoff and configurable retry policies.
 */
const logger = require('./logger');
const shutdownHandler = require('./shutdownHandler');

// Store retry information for active jobs
const activeRetries = new Map();

/**
 * Register a job for automatic retry
 * 
 * @param {string} jobId - The job ID
 * @param {function} retryFunction - The function to call for retry
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelayMs - Initial delay in milliseconds (default: 5000)
 * @param {number} options.backoffFactor - Factor to increase delay by each retry (default: 2)
 * @param {number} options.maxDelayMs - Maximum delay in milliseconds (default: 60000)
 * @param {function} options.shouldRetry - Function to determine if retry should occur (default: always)
 * @returns {object} - Retry information
 */
function registerJobForRetry(jobId, retryFunction, options = {}) {
  const defaultOptions = {
    maxRetries: 3,
    initialDelayMs: 5000,
    backoffFactor: 2,
    maxDelayMs: 60000,
    shouldRetry: (error) => true // Default to always retry
  };
  
  const retryOptions = { ...defaultOptions, ...options };
  
  // Create retry entry
  const retryInfo = {
    jobId,
    retryFunction,
    options: retryOptions,
    retryCount: 0,
    nextRetryDelayMs: retryOptions.initialDelayMs,
    active: false,
    timer: null,
    lastError: null
  };
  
  activeRetries.set(jobId, retryInfo);
  logger.info(`Registered job for automatic retry: ${jobId}`, { maxRetries: retryOptions.maxRetries });
  
  return retryInfo;
}

/**
 * Handle a job failure and schedule a retry if appropriate
 * 
 * @param {string} jobId - The job ID
 * @param {Error} error - The error that occurred
 * @returns {boolean} - Whether a retry was scheduled
 */
function handleFailure(jobId, error) {
  const retryInfo = activeRetries.get(jobId);
  
  if (!retryInfo) {
    logger.warn(`Attempted to handle failure for non-registered job: ${jobId}`);
    return false;
  }
  
  // Update retry info
  retryInfo.lastError = error;
  retryInfo.retryCount++;
  
  // Check if we've exceeded max retries
  if (retryInfo.retryCount > retryInfo.options.maxRetries) {
    logger.info(`Exceeded maximum retries (${retryInfo.options.maxRetries}) for job: ${jobId}`);
    unregisterJob(jobId);
    return false;
  }
  
  // Check if we should retry based on the error
  if (!retryInfo.options.shouldRetry(error)) {
    logger.info(`Retry policy determined not to retry job: ${jobId}`, { error: error.message });
    unregisterJob(jobId);
    return false;
  }
  
  // Calculate next retry delay with exponential backoff
  const nextDelayMs = Math.min(
    retryInfo.nextRetryDelayMs * retryInfo.options.backoffFactor,
    retryInfo.options.maxDelayMs
  );
  
  // Schedule retry
  retryInfo.active = true;
  
  logger.info(`Scheduling retry ${retryInfo.retryCount} of ${retryInfo.options.maxRetries} for job: ${jobId}`, {
    delayMs: nextDelayMs,
    error: error.message
  });
  
  // Register with shutdown handler to ensure we don't leave timers running
  const processId = `retry-${jobId}-${retryInfo.retryCount}`;
  shutdownHandler.registerProcess(processId);
  
  // Schedule retry
  retryInfo.timer = setTimeout(() => {
    try {
      logger.info(`Executing retry ${retryInfo.retryCount} for job: ${jobId}`);
      retryInfo.retryFunction(jobId, retryInfo.retryCount, error)
        .then(() => {
          logger.info(`Retry ${retryInfo.retryCount} succeeded for job: ${jobId}`);
          unregisterJob(jobId);
        })
        .catch(newError => {
          logger.error(`Retry ${retryInfo.retryCount} failed for job: ${jobId}`, { error: newError.message });
          
          // Update for next retry
          retryInfo.nextRetryDelayMs = nextDelayMs;
          retryInfo.active = false;
          
          // Handle next failure
          handleFailure(jobId, newError);
        })
        .finally(() => {
          shutdownHandler.unregisterProcess(processId);
        });
    } catch (retryError) {
      logger.error(`Error during retry setup for job: ${jobId}`, { error: retryError.message });
      shutdownHandler.unregisterProcess(processId);
      
      // Update for next retry
      retryInfo.nextRetryDelayMs = nextDelayMs;
      retryInfo.active = false;
      
      // Try again
      handleFailure(jobId, retryError);
    }
  }, retryInfo.nextRetryDelayMs);
  
  return true;
}

/**
 * Unregister a job from retry system
 * 
 * @param {string} jobId - The job ID
 */
function unregisterJob(jobId) {
  const retryInfo = activeRetries.get(jobId);
  
  if (retryInfo) {
    // Clear any pending timer
    if (retryInfo.timer) {
      clearTimeout(retryInfo.timer);
    }
    
    activeRetries.delete(jobId);
    logger.info(`Unregistered job from retry system: ${jobId}`);
  }
}

/**
 * Check if a job has active retries
 * 
 * @param {string} jobId - The job ID
 * @returns {boolean} - Whether the job has active retries
 */
function hasActiveRetry(jobId) {
  const retryInfo = activeRetries.get(jobId);
  return !!(retryInfo && retryInfo.active);
}

/**
 * Get information about retries for a job
 * 
 * @param {string} jobId - The job ID
 * @returns {object|null} - Retry information or null if not found
 */
function getRetryInfo(jobId) {
  const retryInfo = activeRetries.get(jobId);
  
  if (!retryInfo) {
    return null;
  }
  
  return {
    jobId: retryInfo.jobId,
    retryCount: retryInfo.retryCount,
    maxRetries: retryInfo.options.maxRetries,
    active: retryInfo.active,
    nextRetryMs: retryInfo.nextRetryDelayMs,
    lastError: retryInfo.lastError ? retryInfo.lastError.message : null
  };
}

/**
 * Cancel all active retries for a job
 * 
 * @param {string} jobId - The job ID
 */
function cancelRetries(jobId) {
  const retryInfo = activeRetries.get(jobId);
  
  if (retryInfo) {
    logger.info(`Cancelling retries for job: ${jobId}`);
    unregisterJob(jobId);
    return true;
  }
  
  return false;
}

/**
 * Get statistics about active retries
 * 
 * @returns {object} - Retry statistics
 */
function getRetryStats() {
  const stats = {
    total: activeRetries.size,
    active: 0,
    byRetryCount: {}
  };
  
  for (const [jobId, retryInfo] of activeRetries.entries()) {
    if (retryInfo.active) {
      stats.active++;
    }
    
    // Count by retry count
    const count = retryInfo.retryCount;
    stats.byRetryCount[count] = (stats.byRetryCount[count] || 0) + 1;
  }
  
  return stats;
}

// Retry policies
const RetryPolicies = {
  // Retry on any error
  ALWAYS: (error) => true,
  
  // Don't retry on specific errors
  EXCEPT: (errorTypes) => (error) => {
    if (Array.isArray(errorTypes)) {
      return !errorTypes.some(type => error instanceof type || error.name === type || error.message.includes(type));
    }
    return true;
  },
  
  // Only retry on specific errors
  ONLY: (errorTypes) => (error) => {
    if (Array.isArray(errorTypes)) {
      return errorTypes.some(type => error instanceof type || error.name === type || error.message.includes(type));
    }
    return false;
  },
  
  // Don't retry on permanent/fatal errors
  NOT_PERMANENT: (error) => {
    // Define patterns for non-retryable errors
    const permanentPatterns = [
      'not found',
      'unauthorized',
      'forbidden',
      'invalid',
      'already exists',
      'quota exceeded',
      'syntax error'
    ];
    
    const message = (error.message || '').toLowerCase();
    return !permanentPatterns.some(pattern => message.includes(pattern));
  },
  
  // Only retry on transient errors
  ONLY_TRANSIENT: (error) => {
    // Define patterns for transient errors
    const transientPatterns = [
      'timeout',
      'connection',
      'network',
      'temporarily unavailable',
      'too many requests',
      'rate limit',
      'server error'
    ];
    
    const message = (error.message || '').toLowerCase();
    return transientPatterns.some(pattern => message.includes(pattern));
  }
};

module.exports = {
  registerJobForRetry,
  handleFailure,
  unregisterJob,
  hasActiveRetry,
  getRetryInfo,
  cancelRetries,
  getRetryStats,
  RetryPolicies
}; 