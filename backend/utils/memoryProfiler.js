/**
 * Memory Profiler Utility
 * 
 * Provides tools to monitor and optimize memory usage during vectorization jobs
 */

const os = require('os');
const v8 = require('v8');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Create memory event emitter
const memoryEvents = new EventEmitter();

// Configure thresholds (in MB)
const DEFAULT_THRESHOLDS = {
  warning: 80,      // 80% of available memory
  critical: 90,     // 90% of available memory
  absoluteMax: 95   // 95% of available memory (force garbage collection)
};

// Profiler state
let profilerState = {
  isRunning: false,
  interval: null,
  thresholds: { ...DEFAULT_THRESHOLDS },
  metricsPath: path.join(__dirname, '..', 'logs', 'memory-metrics'),
  currentJobId: null,
  startTime: null,
  peakMemoryUsage: 0,
  samples: [],
  sampleInterval: 5000,  // 5 seconds by default
  lastSampleTime: 0,
  lastWarningEmitted: 0,
  warningCooldown: 30000, // 30 seconds between warnings
  logToConsole: process.env.NODE_ENV !== 'production'
};

/**
 * Initialize the memory metrics directory
 */
function ensureMetricsDirectory() {
  if (!fs.existsSync(profilerState.metricsPath)) {
    fs.mkdirSync(profilerState.metricsPath, { recursive: true });
  }
}

/**
 * Get current memory usage statistics
 * @returns {Object} Memory usage stats
 */
function getMemoryStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  // Get process-specific memory usage
  const processMemory = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  
  // Convert to MB for readability
  const toMB = bytes => Math.round(bytes / 1024 / 1024);
  
  return {
    timestamp: Date.now(),
    system: {
      totalMemory: toMB(totalMem),
      freeMemory: toMB(freeMem),
      usedMemory: toMB(usedMem),
      usedPercentage: Math.round((usedMem / totalMem) * 100)
    },
    process: {
      rss: toMB(processMemory.rss),
      heapTotal: toMB(processMemory.heapTotal),
      heapUsed: toMB(processMemory.heapUsed),
      external: toMB(processMemory.external),
      arrayBuffers: toMB(processMemory.arrayBuffers || 0)
    },
    v8: {
      heapSizeLimit: toMB(heapStats.heap_size_limit),
      totalHeapSize: toMB(heapStats.total_heap_size),
      usedHeapSize: toMB(heapStats.used_heap_size),
      heapUsedPercentage: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 100)
    }
  };
}

/**
 * Format memory stats for logging
 * @param {Object} stats The memory statistics
 * @returns {String} Formatted stats string
 */
function formatMemoryStats(stats) {
  return `[Memory] System: ${stats.system.usedPercentage}% (${stats.system.usedMemory}MB/${stats.system.totalMemory}MB) | ` +
         `Process: RSS ${stats.process.rss}MB, Heap: ${stats.process.heapUsed}MB/${stats.process.heapTotal}MB | ` +
         `V8 Heap: ${stats.v8.usedHeapSize}MB/${stats.v8.heapSizeLimit}MB (${stats.v8.heapUsedPercentage}%)`;
}

/**
 * Check if memory usage exceeds thresholds and take action if needed
 * @param {Object} stats Memory statistics
 */
function checkThresholds(stats) {
  const { system, v8 } = stats;
  const systemPercentage = system.usedPercentage;
  const heapPercentage = v8.heapUsedPercentage;
  
  // Update peak memory usage
  if (systemPercentage > profilerState.peakMemoryUsage) {
    profilerState.peakMemoryUsage = systemPercentage;
  }
  
  const now = Date.now();
  const canEmitWarning = (now - profilerState.lastWarningEmitted) > profilerState.warningCooldown;
  
  // Check for critical threshold
  if (systemPercentage >= profilerState.thresholds.critical || 
      heapPercentage >= profilerState.thresholds.critical) {
    if (canEmitWarning) {
      profilerState.lastWarningEmitted = now;
      memoryEvents.emit('memory-critical', { 
        systemPercentage, 
        heapPercentage, 
        stats,
        jobId: profilerState.currentJobId 
      });
    }
    return;
  }
  
  // Check for warning threshold
  if (systemPercentage >= profilerState.thresholds.warning || 
      heapPercentage >= profilerState.thresholds.warning) {
    if (canEmitWarning) {
      profilerState.lastWarningEmitted = now;
      memoryEvents.emit('memory-warning', { 
        systemPercentage, 
        heapPercentage, 
        stats,
        jobId: profilerState.currentJobId 
      });
    }
    return;
  }
}

/**
 * Attempt to recover memory by forcing garbage collection
 * Note: This requires Node to be started with --expose-gc flag
 */
function attemptMemoryRecovery() {
  if (global.gc) {
    console.log('[Memory Profiler] Attempting to recover memory with forced GC');
    global.gc();
    return true;
  } else {
    console.warn('[Memory Profiler] Cannot force garbage collection. Start Node with --expose-gc flag to enable this feature.');
    return false;
  }
}

/**
 * Take a memory snapshot and store it
 * @param {String} reason Reason for taking the snapshot
 * @returns {String} Path to the snapshot file
 */
function takeMemorySnapshot(reason = 'manual') {
  if (!profilerState.currentJobId) {
    console.warn('[Memory Profiler] Cannot take snapshot: No active job ID');
    return null;
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const snapshotDir = path.join(profilerState.metricsPath, 'snapshots');
  
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
  
  const snapshotPath = path.join(
    snapshotDir, 
    `memory-snapshot-${profilerState.currentJobId}-${reason}-${timestamp}.heapsnapshot`
  );
  
  try {
    const snapshot = v8.writeHeapSnapshot(snapshotPath);
    console.log(`[Memory Profiler] Heap snapshot written to ${snapshotPath}`);
    return snapshotPath;
  } catch (error) {
    console.error('[Memory Profiler] Failed to write heap snapshot:', error);
    return null;
  }
}

/**
 * Sample memory usage and store metrics
 */
function sampleMemory() {
  const now = Date.now();
  
  // Only sample at specified intervals
  if (now - profilerState.lastSampleTime < profilerState.sampleInterval) {
    return;
  }
  
  const stats = getMemoryStats();
  profilerState.lastSampleTime = now;
  profilerState.samples.push(stats);
  
  // Check if we need to take action based on memory usage
  checkThresholds(stats);
  
  // Log to console if enabled
  if (profilerState.logToConsole) {
    console.log(formatMemoryStats(stats));
  }
  
  // Emit regular update event
  memoryEvents.emit('memory-sample', stats);
}

/**
 * Start monitoring memory usage
 * @param {Object} options Configuration options
 * @returns {Boolean} Success status
 */
function startMemoryMonitoring(options = {}) {
  if (profilerState.isRunning) {
    return false;
  }
  
  // Update state with provided options
  if (options.jobId) {
    profilerState.currentJobId = options.jobId;
  }
  
  if (options.sampleInterval) {
    profilerState.sampleInterval = options.sampleInterval;
  }
  
  if (options.thresholds) {
    profilerState.thresholds = {
      ...profilerState.thresholds,
      ...options.thresholds
    };
  }
  
  if (typeof options.logToConsole === 'boolean') {
    profilerState.logToConsole = options.logToConsole;
  }
  
  // Reset profiler state
  profilerState.isRunning = true;
  profilerState.startTime = Date.now();
  profilerState.peakMemoryUsage = 0;
  profilerState.samples = [];
  profilerState.lastSampleTime = 0;
  
  // Ensure metrics directory exists
  ensureMetricsDirectory();
  
  // Start sampling at regular intervals
  profilerState.interval = setInterval(() => {
    sampleMemory();
  }, 1000); // Check every second, but sample based on sampleInterval
  
  console.log(`[Memory Profiler] Started monitoring for job ${profilerState.currentJobId || 'unknown'}`);
  
  // Take initial snapshot
  if (options.takeInitialSnapshot) {
    takeMemorySnapshot('initial');
  }
  
  return true;
}

/**
 * Stop monitoring memory usage and save metrics
 * @param {Boolean} takeFinalSnapshot Whether to take a final heap snapshot
 * @returns {Object} Memory profiling results
 */
function stopMemoryMonitoring(takeFinalSnapshot = false) {
  if (!profilerState.isRunning) {
    return null;
  }
  
  // Stop the monitoring interval
  clearInterval(profilerState.interval);
  profilerState.isRunning = false;
  
  const endTime = Date.now();
  const duration = endTime - profilerState.startTime;
  
  // Take final snapshot if requested
  let finalSnapshotPath = null;
  if (takeFinalSnapshot) {
    finalSnapshotPath = takeMemorySnapshot('final');
  }
  
  // Calculate summary statistics
  const summary = calculateSummaryStats(profilerState.samples);
  
  // Save the metrics
  const metricsFile = `memory-metrics-${profilerState.currentJobId || 'unknown'}-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const metricsPath = path.join(profilerState.metricsPath, metricsFile);
  
  const results = {
    jobId: profilerState.currentJobId,
    startTime: new Date(profilerState.startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration,
    peakMemoryUsage: profilerState.peakMemoryUsage,
    summary,
    samples: profilerState.samples,
    finalSnapshotPath
  };
  
  fs.writeFileSync(metricsPath, JSON.stringify(results, null, 2));
  
  console.log(`[Memory Profiler] Stopped monitoring. Metrics saved to ${metricsPath}`);
  console.log(`[Memory Profiler] Peak memory usage: ${profilerState.peakMemoryUsage}%`);
  
  // Reset job-specific state
  profilerState.currentJobId = null;
  
  return results;
}

/**
 * Calculate summary statistics from samples
 * @param {Array} samples Collection of memory samples
 * @returns {Object} Summary statistics
 */
function calculateSummaryStats(samples) {
  if (!samples.length) {
    return {
      count: 0,
      system: { avgUsedPercentage: 0 },
      process: { avgHeapUsed: 0 },
      v8: { avgHeapUsedPercentage: 0 }
    };
  }
  
  let totalSystemPercentage = 0;
  let totalHeapUsed = 0;
  let totalV8HeapPercentage = 0;
  
  let maxSystemPercentage = 0;
  let maxHeapUsed = 0;
  let maxV8HeapPercentage = 0;
  
  samples.forEach(sample => {
    // System memory
    totalSystemPercentage += sample.system.usedPercentage;
    maxSystemPercentage = Math.max(maxSystemPercentage, sample.system.usedPercentage);
    
    // Process heap
    totalHeapUsed += sample.process.heapUsed;
    maxHeapUsed = Math.max(maxHeapUsed, sample.process.heapUsed);
    
    // V8 heap
    totalV8HeapPercentage += sample.v8.heapUsedPercentage;
    maxV8HeapPercentage = Math.max(maxV8HeapPercentage, sample.v8.heapUsedPercentage);
  });
  
  return {
    count: samples.length,
    system: {
      avgUsedPercentage: Math.round(totalSystemPercentage / samples.length),
      maxUsedPercentage: maxSystemPercentage
    },
    process: {
      avgHeapUsed: Math.round(totalHeapUsed / samples.length),
      maxHeapUsed: maxHeapUsed
    },
    v8: {
      avgHeapUsedPercentage: Math.round(totalV8HeapPercentage / samples.length),
      maxHeapUsedPercentage: maxV8HeapPercentage
    }
  };
}

/**
 * Check if the system has enough memory for the operation
 * @param {Number} requiredMB Estimated memory required in MB 
 * @returns {Boolean} True if enough memory is available
 */
function hasEnoughMemory(requiredMB) {
  const stats = getMemoryStats();
  const availableMB = stats.system.freeMemory;
  return availableMB >= requiredMB;
}

/**
 * Estimate memory requirements for different operations
 * @param {Object} options Details about the operation
 * @returns {Number} Estimated memory requirement in MB
 */
function estimateMemoryRequirement(options) {
  const { operation, fileCount, totalSizeBytes, averageFileSizeBytes } = options;
  
  switch (operation) {
    case 'vectorization':
      // Rough estimate based on observed usage patterns
      // Base memory + per file overhead
      return 200 + (fileCount * 0.5) + (totalSizeBytes / (1024 * 1024) * 0.2);
      
    case 'batch-processing':
      // Lower estimate as we're processing in batches
      return 150 + (averageFileSizeBytes * 50 / (1024 * 1024));
      
    default:
      // Default conservative estimate
      return 500;
  }
}

/**
 * Recommend batch size based on available memory
 * @param {Number} totalItems Total number of items to process
 * @param {Number} itemMemoryMB Estimated memory per item in MB
 * @returns {Number} Recommended batch size
 */
function recommendBatchSize(totalItems, itemMemoryMB) {
  const stats = getMemoryStats();
  const availableMB = stats.system.freeMemory * 0.7; // Use only 70% of available memory
  
  // Calculate how many items we can process at once
  const maxItems = Math.floor(availableMB / itemMemoryMB);
  
  // Ensure we have at least 1 item per batch
  const batchSize = Math.max(1, Math.min(maxItems, totalItems));
  
  return batchSize;
}

// Export the public API
module.exports = {
  events: memoryEvents,
  getMemoryStats,
  formatMemoryStats,
  startMonitoring: startMemoryMonitoring,
  stopMonitoring: stopMemoryMonitoring,
  takeSnapshot: takeMemorySnapshot,
  attemptMemoryRecovery,
  hasEnoughMemory,
  estimateMemoryRequirement,
  recommendBatchSize
}; 