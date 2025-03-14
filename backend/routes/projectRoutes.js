const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

/**
 * @route   GET /api/projects
 * @desc    Get all projects for the authenticated user
 * @access  Private
 */
router.get('/', projectController.getAllProjects);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', projectController.createProject);

/**
 * @route   GET /api/projects/:projectId
 * @desc    Get a project by ID
 * @access  Private
 */
router.get('/:projectId', projectController.getProjectById);

/**
 * @route   PUT /api/projects/:projectId
 * @desc    Update a project
 * @access  Private
 */
router.put('/:projectId', projectController.updateProject);

/**
 * @route   DELETE /api/projects/:projectId
 * @desc    Delete a project
 * @access  Private
 */
router.delete('/:projectId', projectController.deleteProject);

/**
 * @route   GET /api/projects/:projectId/files
 * @desc    Get all files in a project
 * @access  Private
 */
router.get('/:projectId/files', projectController.getProjectFiles);

/**
 * @route   GET /api/projects/:projectId/file/:filePath(*)
 * @desc    Get file content
 * @access  Private
 */
router.get('/:projectId/file/:filePath(*)', projectController.getFileContent);

/**
 * @route   POST /api/projects/:projectId/file/:filePath(*)
 * @desc    Update file content
 * @access  Private
 */
router.post('/:projectId/file/:filePath(*)', projectController.updateFileContent);

/**
 * @route   DELETE /api/projects/:projectId/file/:filePath(*)
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/:projectId/file/:filePath(*)', projectController.deleteFile);

/**
 * @route   POST /api/projects/:projectId/analyze
 * @desc    Analyze a project
 * @access  Private
 */
router.post('/:projectId/analyze', projectController.analyzeProject);

/**
 * @route   GET /api/projects/:projectId/analysis
 * @desc    Get project analysis
 * @access  Private
 */
router.get('/:projectId/analysis', projectController.getProjectAnalysis);

module.exports = router; 