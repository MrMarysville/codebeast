const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Joi = require('joi');
const { validateRequest } = require('../middleware/validationMiddleware');
const featureValidation = require('../validations/feature.validation');
const { asyncHandler, ApiError } = require('../middleware/errorMiddleware');

/**
 * @route   GET /api/features
 * @desc    Get all available features
 * @access  Private
 */
router.get(
  '/', 
  asyncHandler(async (req, res) => {
    // In a real app, this would fetch from a database
    // For demo purposes, returning a static list
    const features = [
      {
        id: 'vectorizer',
        name: 'Code Vectorization',
        description: 'Analyze and vectorize code for semantic search and similarity',
        status: 'available',
        icon: 'vector'
      },
      {
        id: 'refactor',
        name: 'Code Refactoring',
        description: 'Automatically refactor code to improve quality and readability',
        status: 'available',
        icon: 'refactor'
      },
      {
        id: 'documentation',
        name: 'Documentation Generator',
        description: 'Generate comprehensive documentation for your code',
        status: 'available',
        icon: 'document'
      },
      {
        id: 'testing',
        name: 'Test Generation',
        description: 'Generate test cases for your code',
        status: 'coming_soon',
        icon: 'test'
      }
    ];

    res.json({
      success: true,
      features
    });
  })
);

/**
 * @route   GET /api/features/:featureId
 * @desc    Get details about a specific feature
 * @access  Private
 */
router.get(
  '/:featureId', 
  validateRequest({
    params: Joi.object({
      featureId: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { featureId } = req.params;
    
    // Map of available features
    const featuresMap = {
      'vectorizer': {
        id: 'vectorizer',
        name: 'Code Vectorization',
        description: 'Analyze and vectorize code for semantic search and similarity',
        status: 'available',
        icon: 'vector',
        details: {
          supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'c#', 'php'],
          processingTime: 'Depends on codebase size (typically 1-5 minutes)',
          accuracy: 'High',
          limitations: 'Maximum file size: 10MB per file'
        }
      },
      'refactor': {
        id: 'refactor',
        name: 'Code Refactoring',
        description: 'Automatically refactor code to improve quality and readability',
        status: 'available',
        icon: 'refactor',
        details: {
          supportedLanguages: ['javascript', 'typescript', 'python'],
          capabilities: [
            'Rename variables for clarity',
            'Extract methods/functions',
            'Remove dead code',
            'Fix common anti-patterns'
          ]
        }
      },
      'documentation': {
        id: 'documentation',
        name: 'Documentation Generator',
        description: 'Generate comprehensive documentation for your code',
        status: 'available',
        icon: 'document',
        details: {
          supportedLanguages: ['javascript', 'typescript', 'python', 'java'],
          outputFormats: ['Markdown', 'HTML', 'JSDoc/TSDoc']
        }
      },
      'testing': {
        id: 'testing',
        name: 'Test Generation',
        description: 'Generate test cases for your code',
        status: 'coming_soon',
        icon: 'test',
        details: {
          releaseDate: 'Q2 2025',
          plannedCapabilities: [
            'Unit test generation',
            'Integration test scenarios',
            'Test coverage analysis'
          ]
        }
      }
    };
    
    const feature = featuresMap[featureId];
    
    if (!feature) {
      throw new ApiError('Feature not found', 404);
    }

    res.json({
      success: true,
      feature
    });
  })
);

/**
 * @route   GET /api/projects/:projectId/features
 * @desc    Get all features for a project
 * @access  Private
 */
router.get(
  '/projects/:projectId/features',
  validateRequest(featureValidation.getAllFeatures),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { status, priority, search, sort = 'name', order = 'asc' } = req.query;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Get features from project metadata
    const featuresDir = path.join(projectDir, '.features');
    let features = [];
    
    if (fs.existsSync(featuresDir)) {
      try {
        const featureFiles = await fs.readdir(featuresDir);
        
        for (const file of featureFiles) {
          if (file.endsWith('.json')) {
            const featureData = await fs.readJson(path.join(featuresDir, file));
            
            // Apply filters if provided
            if (status && featureData.status !== status) continue;
            if (priority && featureData.priority !== priority) continue;
            if (search && !featureData.name.toLowerCase().includes(search.toLowerCase())) continue;
            
            features.push(featureData);
          }
        }
        
        // Sort features
        if (sort === 'name') {
          features.sort((a, b) => {
            return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
          });
        } else if (sort === 'status') {
          features.sort((a, b) => {
            return order === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
          });
        } else if (sort === 'priority') {
          const priorityOrder = { low: 1, medium: 2, high: 3 };
          features.sort((a, b) => {
            return order === 'asc' 
              ? priorityOrder[a.priority] - priorityOrder[b.priority]
              : priorityOrder[b.priority] - priorityOrder[a.priority];
          });
        } else if (sort === 'created') {
          features.sort((a, b) => {
            return order === 'asc' 
              ? new Date(a.createdAt) - new Date(b.createdAt)
              : new Date(b.createdAt) - new Date(a.createdAt);
          });
        } else if (sort === 'updated') {
          features.sort((a, b) => {
            return order === 'asc' 
              ? new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt)
              : new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
          });
        }
      } catch (error) {
        console.error(`Error reading features for project ${projectId}:`, error);
      }
    }
    
    res.json({
      success: true,
      features
    });
  })
);

/**
 * @route   POST /api/projects/:projectId/features
 * @desc    Create a new feature for a project
 * @access  Private
 */
router.post(
  '/projects/:projectId/features',
  validateRequest(featureValidation.createFeature),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name, description, status = 'planned', priority = 'medium', components = [] } = req.body;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Create features directory if it doesn't exist
    const featuresDir = path.join(projectDir, '.features');
    await fs.ensureDir(featuresDir);
    
    // Generate feature ID
    const featureId = Buffer.from(`feature-${Date.now()}-${name}`).toString('base64');
    
    // Create feature data
    const featureData = {
      id: featureId,
      name,
      description,
      status,
      priority,
      components,
      createdAt: new Date().toISOString()
    };
    
    // Save feature data
    await fs.writeJson(path.join(featuresDir, `${featureId}.json`), featureData);
    
    res.status(201).json({
      success: true,
      feature: featureData
    });
  })
);

/**
 * @route   GET /api/projects/:projectId/features/:featureId
 * @desc    Get a specific feature for a project
 * @access  Private
 */
router.get(
  '/projects/:projectId/features/:featureId',
  validateRequest(featureValidation.getFeatureById),
  asyncHandler(async (req, res) => {
    const { projectId, featureId } = req.params;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Check if feature exists
    const featurePath = path.join(projectDir, '.features', `${featureId}.json`);
    if (!fs.existsSync(featurePath)) {
      throw new ApiError('Feature not found', 404);
    }
    
    // Get feature data
    const featureData = await fs.readJson(featurePath);
    
    res.json({
      success: true,
      feature: featureData
    });
  })
);

/**
 * @route   PUT /api/projects/:projectId/features/:featureId
 * @desc    Update a feature for a project
 * @access  Private
 */
router.put(
  '/projects/:projectId/features/:featureId',
  validateRequest(featureValidation.updateFeature),
  asyncHandler(async (req, res) => {
    const { projectId, featureId } = req.params;
    const { name, description, status, priority, components } = req.body;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Check if feature exists
    const featurePath = path.join(projectDir, '.features', `${featureId}.json`);
    if (!fs.existsSync(featurePath)) {
      throw new ApiError('Feature not found', 404);
    }
    
    // Get existing feature data
    const featureData = await fs.readJson(featurePath);
    
    // Update feature data
    if (name) featureData.name = name;
    if (description !== undefined) featureData.description = description;
    if (status) featureData.status = status;
    if (priority) featureData.priority = priority;
    if (components) featureData.components = components;
    
    featureData.updatedAt = new Date().toISOString();
    
    // Save updated feature data
    await fs.writeJson(featurePath, featureData);
    
    res.json({
      success: true,
      feature: featureData
    });
  })
);

/**
 * @route   DELETE /api/projects/:projectId/features/:featureId
 * @desc    Delete a feature from a project
 * @access  Private
 */
router.delete(
  '/projects/:projectId/features/:featureId',
  validateRequest(featureValidation.deleteFeature),
  asyncHandler(async (req, res) => {
    const { projectId, featureId } = req.params;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Check if feature exists
    const featurePath = path.join(projectDir, '.features', `${featureId}.json`);
    if (!fs.existsSync(featurePath)) {
      throw new ApiError('Feature not found', 404);
    }
    
    // Delete feature file
    await fs.unlink(featurePath);
    
    res.status(204).send();
  })
);

module.exports = router; 