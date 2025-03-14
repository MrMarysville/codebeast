const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { validateRequest } = require('../middleware/validationMiddleware');
const projectValidation = require('../validations/project.validation');

// Project CRUD operations
router.post('/', validateRequest(projectValidation.createProject), projectController.createProject);
router.get('/', projectController.getAllProjects);
router.get('/:projectId', validateRequest(projectValidation.getProjectById), projectController.getProjectById);
router.put('/:projectId', validateRequest(projectValidation.updateProject), projectController.updateProject);
router.delete('/:projectId', validateRequest(projectValidation.deleteProject), projectController.deleteProject);

// Project analysis
router.post('/:projectId/analyze', validateRequest(projectValidation.getProjectById), projectController.analyzeProject);
router.get('/:projectId/analysis', validateRequest(projectValidation.getProjectById), projectController.getProjectAnalysis);

// Vectorization
router.post('/:projectId/vectorize', validateRequest(projectValidation.startVectorization), projectController.startVectorization);
router.get('/:projectId/vectorization-status', validateRequest(projectValidation.getProjectById), projectController.getVectorizationStatus);
router.get('/:projectId/vector-data', validateRequest(projectValidation.getProjectById), projectController.getVectorData);
router.get('/:projectId/vector-languages', validateRequest(projectValidation.getProjectById), projectController.getVectorLanguages);

// File operations
router.get('/:projectId/files', validateRequest(projectValidation.getProjectFiles), projectController.getProjectFiles);
router.get('/:projectId/files/:filePath(*)', validateRequest(projectValidation.getFileContent), projectController.getFileContent);
router.put('/:projectId/files/:filePath(*)', validateRequest(projectValidation.updateFileContent), projectController.updateFileContent);
router.delete('/:projectId/files/:filePath(*)', validateRequest(projectValidation.deleteFile), projectController.deleteFile);

module.exports = router; 