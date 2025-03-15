/**
 * Processing Queue Utility
 * 
 * Provides a queue system for processing tasks with memory and concurrency management.
 * Especially useful for vectorization tasks that may require significant resources.
 */

const EventEmitter = require('events');
const logger = require('./logger');
const memoryProfiler = require('./memoryProfiler');
const os = require('os');

// Create queue event emitter
const queueEvents = new EventEmitter();

// Queue state
const state = {
  tasks: [],
  activeCount: 0,
  maxConcurrent: Math.max(1, Math.min(os.cpus().length - 1, 4)), // Default to CPU count - 1, max 4
  paused: false,
  processingTimer: null,
  memoryThreshold: 80, // Pause queue if memory usage exceeds this percentage
  lowMemoryMode: false
};

/**
 * Add a task to the queue
 * 
 * @param {Object} task - Task to add
 * @param {string} task.id - Unique task ID
 * @param {Function} task.process - Async function to process the task
 * @param {Object} [task.data] - Data needed by the process function
 * @param {number} [task.priority=0] - Priority (higher is processed first)
 * @param {number} [task.estimatedMemoryMB=100] - Estimated memory usage in MB
 * @returns {string} - Task ID
 */
function addTask(task) {
  if (!task.id || !task.process) {
    throw new Error('Task must have an ID and process function');
  }
  
  // Create the task object with defaults
  const newTask = {
    id: task.id,
    process: task.process,
    data: task.data || {},
    priority: task.priority || 0,
    estimatedMemoryMB: task.estimatedMemoryMB || 100,
    added: Date.now(),
    status: 'queued'
  };
  
  // Add to queue
  state.tasks.push(newTask);
  
  // Sort queue by priority (higher first)
  state.tasks.sort((a, b) => b.priority - a.priority);
  
  logger.info(`Task added to queue: ${task.id}`, { 
    taskId: task.id,
    queueLength: state.tasks.length,
    activeCount: state.activeCount
  });
  
  // Emit event
  queueEvents.emit('task-added', newTask);
  
  // Start processing if not already running
  if (!state.processingTimer) {
    scheduleProcessing();
  }
  
  return task.id;
}

/**
 * Schedule the queue processing
 */
function scheduleProcessing() {
  if (state.processingTimer) {
    clearTimeout(state.processingTimer);
  }
  
  state.processingTimer = setTimeout(processQueue, 100);
}

/**
 * Process the next tasks in the queue
 */
async function processQueue() {
  state.processingTimer = null;
  
  // Check if queue is paused
  if (state.paused) {
    logger.debug('Queue is paused, not processing tasks');
    return;
  }
  
  // Check memory usage
  const memoryStats = memoryProfiler.getMemoryStats();
  const memoryUsage = memoryStats.system.usedPercentage;
  
  // If memory usage is too high, pause the queue
  if (memoryUsage > state.memoryThreshold) {
    if (!state.lowMemoryMode) {
      logger.warn(`Memory usage is high (${memoryUsage}%), entering low memory mode`);
      state.lowMemoryMode = true;
      state.maxConcurrent = Math.max(1, Math.floor(state.maxConcurrent / 2));
      
      // If already at max concurrency, wait for some tasks to complete
      if (state.activeCount >= state.maxConcurrent) {
        scheduleProcessing();
        return;
      }
    }
  } else if (state.lowMemoryMode && memoryUsage < state.memoryThreshold - 10) {
    // If memory usage has decreased, exit low memory mode
    logger.info(`Memory usage has decreased to ${memoryUsage}%, exiting low memory mode`);
    state.lowMemoryMode = false;
    state.maxConcurrent = Math.max(1, Math.min(os.cpus().length - 1, 4));
  }
  
  // If at max concurrency, wait for some tasks to complete
  if (state.activeCount >= state.maxConcurrent) {
    return;
  }
  
  // Find tasks that can be processed
  const tasksToProcess = [];
  
  for (let i = 0; i < state.tasks.length; i++) {
    const task = state.tasks[i];
    
    // Skip non-queued tasks
    if (task.status !== 'queued') {
      continue;
    }
    
    // Check if we have enough memory for this task
    if (state.lowMemoryMode) {
      // In low memory mode, only start small tasks
      if (task.estimatedMemoryMB > 50) {
        continue;
      }
    } else if (!memoryProfiler.hasEnoughMemory(task.estimatedMemoryMB)) {
      // Not enough memory for this task
      logger.debug(`Not enough memory for task ${task.id} (requires ~${task.estimatedMemoryMB}MB)`);
      continue;
    }
    
    // Check if we can process more tasks
    if (tasksToProcess.length + state.activeCount >= state.maxConcurrent) {
      break;
    }
    
    // Task can be processed
    tasksToProcess.push(task);
  }
  
  // Process the tasks
  if (tasksToProcess.length > 0) {
    tasksToProcess.forEach(task => {
      processTask(task);
    });
  } else if (state.tasks.some(t => t.status === 'queued')) {
    // If there are still queued tasks but none can be processed yet,
    // schedule another check soon
    scheduleProcessing();
  }
}

/**
 * Process a single task
 * 
 * @param {Object} task - Task to process
 */
async function processTask(task) {
  // Update task status
  task.status = 'processing';
  task.started = Date.now();
  state.activeCount++;
  
  // Emit event
  queueEvents.emit('task-started', task);
  
  try {
    logger.debug(`Processing task ${task.id}`);
    
    // Call the process function
    const result = await task.process(task.data);
    
    // Task completed successfully
    task.status = 'completed';
    task.completed = Date.now();
    task.duration = task.completed - task.started;
    task.result = result;
    
    logger.info(`Task ${task.id} completed successfully in ${task.duration}ms`);
    
    // Emit completion event
    queueEvents.emit('task-completed', task);
    
  } catch (error) {
    // Task failed
    task.status = 'failed';
    task.completed = Date.now();
    task.duration = task.completed - task.started;
    task.error = error.message;
    
    logger.error(`Task ${task.id} failed: ${error.message}`, { error: error.stack });
    
    // Emit error event
    queueEvents.emit('task-failed', task, error);
  } finally {
    // Update state
    state.activeCount--;
    
    // Remove task from queue after a delay (for status reporting)
    setTimeout(() => {
      const index = state.tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        state.tasks.splice(index, 1);
      }
      
      // Process next tasks
      if (!state.paused && state.tasks.some(t => t.status === 'queued')) {
        scheduleProcessing();
      }
      
      // Emit removal event
      queueEvents.emit('task-removed', task);
    }, 30000); // Keep completed tasks for 30 seconds
    
    // Schedule processing of next tasks
    if (!state.paused) {
      scheduleProcessing();
    }
  }
}

/**
 * Pause the queue
 */
function pauseQueue() {
  if (!state.paused) {
    state.paused = true;
    logger.info('Processing queue paused');
    queueEvents.emit('queue-paused');
  }
}

/**
 * Resume the queue
 */
function resumeQueue() {
  if (state.paused) {
    state.paused = false;
    logger.info('Processing queue resumed');
    queueEvents.emit('queue-resumed');
    
    // Restart processing
    if (state.tasks.some(t => t.status === 'queued')) {
      scheduleProcessing();
    }
  }
}

/**
 * Configure the queue
 * 
 * @param {Object} options - Configuration options
 * @param {number} [options.maxConcurrent] - Maximum concurrent tasks
 * @param {number} [options.memoryThreshold] - Memory threshold percentage
 */
function configureQueue(options = {}) {
  if (typeof options.maxConcurrent === 'number') {
    state.maxConcurrent = Math.max(1, options.maxConcurrent);
  }
  
  if (typeof options.memoryThreshold === 'number') {
    state.memoryThreshold = Math.max(50, Math.min(95, options.memoryThreshold));
  }
  
  logger.info(`Queue configured: maxConcurrent=${state.maxConcurrent}, memoryThreshold=${state.memoryThreshold}%`);
  
  return { maxConcurrent: state.maxConcurrent, memoryThreshold: state.memoryThreshold };
}

/**
 * Get the current queue status
 * 
 * @returns {Object} - Queue status
 */
function getQueueStatus() {
  return {
    queuedTasks: state.tasks.filter(t => t.status === 'queued').length,
    activeTasks: state.activeCount,
    completedTasks: state.tasks.filter(t => t.status === 'completed').length,
    failedTasks: state.tasks.filter(t => t.status === 'failed').length,
    paused: state.paused,
    lowMemoryMode: state.lowMemoryMode,
    maxConcurrent: state.maxConcurrent,
    memoryThreshold: state.memoryThreshold,
    memoryUsage: memoryProfiler.getMemoryStats().system.usedPercentage
  };
}

/**
 * Get a task by ID
 * 
 * @param {string} taskId - Task ID
 * @returns {Object|null} - Task or null if not found
 */
function getTask(taskId) {
  return state.tasks.find(t => t.id === taskId) || null;
}

/**
 * Get all tasks matching a filter
 * 
 * @param {Function} [filterFn] - Filter function
 * @returns {Array} - Matching tasks
 */
function getTasks(filterFn) {
  if (typeof filterFn === 'function') {
    return state.tasks.filter(filterFn);
  }
  return [...state.tasks];
}

/**
 * Cancel a task by ID
 * 
 * @param {string} taskId - Task ID
 * @returns {boolean} - Whether the task was cancelled
 */
function cancelTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  
  if (!task) {
    return false;
  }
  
  // Can only cancel queued tasks
  if (task.status !== 'queued') {
    return false;
  }
  
  // Mark as cancelled
  task.status = 'cancelled';
  task.cancelled = Date.now();
  
  logger.info(`Task ${taskId} cancelled`);
  
  // Emit event
  queueEvents.emit('task-cancelled', task);
  
  // Remove from queue after a delay
  setTimeout(() => {
    const index = state.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      state.tasks.splice(index, 1);
      queueEvents.emit('task-removed', task);
    }
  }, 30000); // Keep cancelled tasks for 30 seconds
  
  return true;
}

// Export the module
module.exports = {
  addTask,
  pauseQueue,
  resumeQueue,
  configureQueue,
  getQueueStatus,
  getTask,
  getTasks,
  cancelTask,
  events: queueEvents
}; 