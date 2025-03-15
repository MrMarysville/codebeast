/**
 * Vectorization Routes
 * 
 * API endpoints for the vectorization system with enhanced job tracking.
 */
const express = require('express');
const router = express.Router();
const vectorizeController = require('../controllers/vectorize.controller');

/**
 * @route POST /api/vectorize/project
 * @description Start a vectorization job for a project folder
 * @body {string} projectPath - Path to the project folder
 * @body {string} vectorizationMethod - (Optional) Method to use: 'simple', 'enhanced', 'incremental'
 * @body {array} fileTypes - (Optional) Array of file extensions to include
 * @returns {object} Response with job ID
 */
router.post('/project', vectorizeController.vectorizeProject);

/**
 * @route GET /api/vectorize/status/:jobId
 * @description Get the status of a vectorization job
 * @param {string} jobId - Job ID
 * @returns {object} Job status
 */
router.get('/status/:jobId', vectorizeController.getVectorizationStatus);

/**
 * @route POST /api/vectorize/cancel/:jobId
 * @description Cancel a vectorization job
 * @param {string} jobId - Job ID
 * @returns {object} Confirmation of cancellation
 */
router.post('/cancel/:jobId', vectorizeController.cancelVectorization);

/**
 * @route GET /api/vectorize/stats
 * @description Get statistics about all vectorization jobs
 * @returns {object} Job statistics
 */
router.get('/stats', vectorizeController.getVectorizationStats);

/**
 * @route GET /api/vectorize/info/:projectId
 * @description Get information about vectors for a project
 * @param {string} projectId - Project ID
 * @returns {object} Vector information
 */
router.get('/info/:projectId', vectorizeController.getVectorInfo);

/**
 * @swagger
 * /api/vectorize/queue:
 *   get:
 *     summary: Get current status of the vectorization queue
 *     description: Retrieves the current processing queue status, including active and queued tasks
 *     tags:
 *       - Vectorization
 *     responses:
 *       200:
 *         description: Queue status information returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 status:
 *                   type: object
 *                   description: The current status of the processing queue
 *                 activeTasks:
 *                   type: array
 *                   description: List of currently active tasks
 *                 queuedTasks:
 *                   type: array
 *                   description: List of queued tasks waiting to be processed
 *       500:
 *         description: Server error while retrieving queue status
 */
router.get('/queue', vectorizeController.getQueueStatus);

/**
 * @swagger
 * /api/vectorize/queue/{jobId}/cancel:
 *   post:
 *     summary: Cancel a queued vectorization job
 *     description: Attempts to cancel a job that is queued for processing
 *     tags:
 *       - Vectorization
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         description: ID of the job to cancel
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 jobId:
 *                   type: string
 *                   description: ID of the cancelled job
 *       400:
 *         description: Invalid request or job cannot be cancelled
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error while cancelling job
 */
router.post('/queue/:jobId/cancel', vectorizeController.cancelQueuedVectorization);

/**
 * @swagger
 * /api/vectorize/memory-estimate:
 *   post:
 *     summary: Estimate memory requirements for a project
 *     description: Analyzes a project and estimates memory requirements for vectorization
 *     tags:
 *       - Vectorization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectPath
 *             properties:
 *               projectPath:
 *                 type: string
 *                 description: Path to the project to analyze
 *               fileTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: File types to include in the analysis
 *     responses:
 *       200:
 *         description: Memory estimates successfully calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 estimates:
 *                   type: object
 *                   description: Memory estimates for different processing modes
 *                 system:
 *                   type: object
 *                   description: System resource information
 *                 recommendation:
 *                   type: object
 *                   description: Recommendation for processing options
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error during estimation
 */
router.post('/memory-estimate', vectorizeController.estimateMemoryRequirements);

module.exports = router; 