/**
 * Job Model
 * 
 * Represents a vectorization job in the system
 */

const fs = require('fs');
const path = require('path');

// Simple in-memory store for jobs (could be replaced with a database)
let jobs = new Map();

// Jobs data file path
const JOBS_FILE = path.join(__dirname, '..', 'data', 'jobs.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(JOBS_FILE))) {
  fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
}

// Load existing jobs from file if available
try {
  if (fs.existsSync(JOBS_FILE)) {
    const jobsData = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    jobs = new Map(Object.entries(jobsData));
  }
} catch (error) {
  console.error('Error loading jobs from file:', error);
}

/**
 * Save jobs to persistent storage
 */
const saveJobs = () => {
  try {
    // Convert Map to object for JSON serialization
    const jobsObject = Object.fromEntries(jobs);
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobsObject, null, 2));
  } catch (error) {
    console.error('Error saving jobs to file:', error);
  }
};

/**
 * Job model class
 */
class Job {
  /**
   * Create a new job
   * 
   * @param {Object} jobData - Job data
   * @param {string} jobData.jobId - Unique job ID
   * @param {string} jobData.status - Job status
   * @param {string} jobData.type - Job type
   * @param {string} jobData.projectPath - Project path
   * @param {Date} jobData.startTime - Start time
   * @param {Date} [jobData.endTime] - End time
   * @param {number} [jobData.completionTime] - Completion time in ms
   * @param {string} [jobData.error] - Error message if failed
   * @param {Object} [jobData.stats] - Job statistics
   * @param {Object} [jobData.options] - Job options
   * @param {Array} [jobData.logs] - Job logs
   */
  constructor(jobData) {
    this.jobId = jobData.jobId;
    this.status = jobData.status || 'created';
    this.type = jobData.type || 'vectorization';
    this.projectPath = jobData.projectPath;
    this.startTime = jobData.startTime || new Date();
    this.endTime = jobData.endTime || null;
    this.completionTime = jobData.completionTime || null;
    this.error = jobData.error || null;
    this.stats = jobData.stats || {
      filesProcessed: 0,
      errors: 0,
      progress: 0,
      retries: 0
    };
    this.options = jobData.options || {};
    this.logs = jobData.logs || [];
    this.lastUpdated = new Date();
  }

  /**
   * Save the job to the store
   */
  async save() {
    this.lastUpdated = new Date();
    jobs.set(this.jobId, {
      ...this,
      startTime: this.startTime instanceof Date ? this.startTime.toISOString() : this.startTime,
      endTime: this.endTime instanceof Date ? this.endTime.toISOString() : this.endTime,
      lastUpdated: this.lastUpdated.toISOString()
    });
    saveJobs();
    return this;
  }

  /**
   * Update job attributes
   * 
   * @param {Object} updates - Fields to update
   */
  async update(updates) {
    Object.assign(this, updates);
    this.lastUpdated = new Date();
    return await this.save();
  }

  /**
   * Add a log entry
   * 
   * @param {string} message - Log message
   */
  addLog(message) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      message
    });
    this.lastUpdated = new Date();
    return this.save();
  }

  /**
   * Calculate elapsed time
   * 
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime() {
    const end = this.endTime ? new Date(this.endTime) : new Date();
    const start = new Date(this.startTime);
    return end - start;
  }

  /**
   * Convert to API-friendly format
   */
  toJSON() {
    return {
      jobId: this.jobId,
      status: this.status,
      type: this.type,
      projectPath: this.projectPath,
      startTime: this.startTime,
      endTime: this.endTime,
      completionTime: this.completionTime,
      elapsedTimeMs: this.getElapsedTime(),
      error: this.error,
      stats: this.stats,
      options: this.options,
      logs: this.logs.slice(-10), // Only include the most recent logs
      lastUpdated: this.lastUpdated
    };
  }
}

/**
 * Static methods for Job model
 */

/**
 * Find a job by ID
 * 
 * @param {string} jobId - Job ID
 * @returns {Job|null} - Job instance or null if not found
 */
Job.findById = async (jobId) => {
  const jobData = jobs.get(jobId);
  if (!jobData) return null;
  
  return new Job({
    ...jobData,
    startTime: new Date(jobData.startTime),
    endTime: jobData.endTime ? new Date(jobData.endTime) : null,
    lastUpdated: new Date(jobData.lastUpdated)
  });
};

/**
 * Find one job and update it
 * 
 * @param {Object} query - Query to find the job
 * @param {Object} updates - Updates to apply
 * @returns {Job|null} - Updated job
 */
Job.findOneAndUpdate = async (query, updates) => {
  const { jobId } = query;
  const job = await Job.findById(jobId);
  if (!job) return null;
  
  // Handle special update operators
  if (updates.$set) {
    Object.assign(job, updates.$set);
    delete updates.$set;
  }
  
  if (updates.$inc) {
    for (const field in updates.$inc) {
      const value = updates.$inc[field];
      
      // Handle nested fields like 'stats.retries'
      if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        if (!job[parentField]) job[parentField] = {};
        job[parentField][childField] = (job[parentField][childField] || 0) + value;
      } else {
        job[field] = (job[field] || 0) + value;
      }
    }
    delete updates.$inc;
  }
  
  if (updates.$push) {
    for (const field in updates.$push) {
      if (!Array.isArray(job[field])) job[field] = [];
      job[field].push(updates.$push[field]);
    }
    delete updates.$push;
  }
  
  // Apply any remaining updates
  Object.assign(job, updates);
  
  job.lastUpdated = new Date();
  await job.save();
  
  return job;
};

/**
 * Find all jobs
 * 
 * @param {Object} [query] - Query criteria
 * @param {Object} [options] - Query options
 * @returns {Array<Job>} - Array of job instances
 */
Job.findAll = async (query = {}, options = {}) => {
  let result = Array.from(jobs.values())
    .map(jobData => new Job({
      ...jobData,
      startTime: new Date(jobData.startTime),
      endTime: jobData.endTime ? new Date(jobData.endTime) : null,
      lastUpdated: new Date(jobData.lastUpdated)
    }));
  
  // Apply filtering if query provided
  if (Object.keys(query).length > 0) {
    result = result.filter(job => {
      return Object.entries(query).every(([key, value]) => job[key] === value);
    });
  }
  
  // Apply sorting
  if (options.sort) {
    const [field, order] = Object.entries(options.sort)[0];
    result.sort((a, b) => {
      if (order === 1) {
        return a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
      } else {
        return a[field] > b[field] ? -1 : a[field] < b[field] ? 1 : 0;
      }
    });
  }
  
  // Apply limit
  if (options.limit) {
    result = result.slice(0, options.limit);
  }
  
  return result;
};

/**
 * Delete a job
 * 
 * @param {string} jobId - Job ID
 * @returns {boolean} - Success
 */
Job.deleteById = async (jobId) => {
  const deleted = jobs.delete(jobId);
  if (deleted) {
    saveJobs();
  }
  return deleted;
};

/**
 * Clean up old jobs
 * 
 * @param {number} olderThanDays - Delete jobs older than this many days
 * @returns {number} - Number of jobs deleted
 */
Job.cleanupOldJobs = async (olderThanDays = 7) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  let deletedCount = 0;
  for (const [jobId, jobData] of jobs.entries()) {
    const jobDate = new Date(jobData.lastUpdated || jobData.startTime);
    if (jobDate < cutoffDate) {
      jobs.delete(jobId);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    saveJobs();
  }
  
  return deletedCount;
};

module.exports = {
  Job
}; 