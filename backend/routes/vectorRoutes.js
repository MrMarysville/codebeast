const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const projectController = require('../controllers/project.controller');
const { validateRequest } = require('../middleware/validationMiddleware');
const vectorValidation = require('../validations/vector.validation');
const { asyncHandler, ApiError } = require('../middleware/errorMiddleware');

/**
 * @route   GET /api/vectors/status
 * @desc    Get global vectorization status (across all projects)
 * @access  Private
 */
router.get(
  '/status', 
  asyncHandler(async (req, res) => {
    // In a production app, this would query the database for all projects
    // For demo purposes, using mock data
    const { data: projects, error } = await req.supabase
      .from('projects')
      .select('id, name, status')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new ApiError(`Failed to fetch projects: ${error.message}`, 500);
    }

    const projectVectorStatus = await Promise.all(
      projects.map(async (project) => {
        try {
          // Check if vectorization data exists for this project
          const vectorDir = path.join(process.env.UPLOADS_DIR || './uploads', project.id, 'vectors');
          const hasVectors = fs.existsSync(vectorDir);
          
          return {
            projectId: project.id,
            projectName: project.name,
            status: hasVectors ? 'completed' : 'not_started',
            lastUpdated: hasVectors ? 
              (await fs.stat(vectorDir)).mtime.toISOString() : 
              null
          };
        } catch (err) {
          console.error(`Error checking vector status for project ${project.id}:`, err);
          return {
            projectId: project.id,
            projectName: project.name,
            status: 'error',
            error: err.message
          };
        }
      })
    );

    res.json({
      success: true,
      vectorStatus: {
        projectCount: projects.length,
        vectorizedCount: projectVectorStatus.filter(p => p.status === 'completed').length,
        projects: projectVectorStatus
      }
    });
  })
);

/**
 * @route   GET /api/vectors/languages
 * @desc    Get all languages supported for vectorization
 * @access  Private
 */
router.get(
  '/languages', 
  asyncHandler((req, res) => {
    // In a real app, this would come from a configuration or database
    // For demo purposes, providing a static list
    const languages = [
      { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.jsx'] },
      { id: 'typescript', name: 'TypeScript', extensions: ['.ts', '.tsx'] },
      { id: 'python', name: 'Python', extensions: ['.py'] },
      { id: 'java', name: 'Java', extensions: ['.java'] },
      { id: 'csharp', name: 'C#', extensions: ['.cs'] },
      { id: 'php', name: 'PHP', extensions: ['.php'] },
      { id: 'ruby', name: 'Ruby', extensions: ['.rb'] },
      { id: 'go', name: 'Go', extensions: ['.go'] },
      { id: 'rust', name: 'Rust', extensions: ['.rs'] },
      { id: 'swift', name: 'Swift', extensions: ['.swift'] }
    ];

    res.json({
      success: true,
      languages
    });
  })
);

/**
 * @route   GET /api/vectors/cache
 * @desc    Get vector cache info
 * @access  Private
 */
router.get(
  '/cache', 
  asyncHandler((req, res) => {
    // In a real app, this would query the vector database for stats
    // For demo purposes, using mock data
    const cacheInfo = {
      totalVectors: 1245,
      cacheSize: '26.5 MB',
      lastUpdated: new Date().toISOString(),
      status: 'healthy',
      languages: {
        javascript: 524,
        typescript: 312,
        python: 168,
        java: 89,
        other: 152
      }
    };

    res.json({
      success: true,
      cacheInfo
    });
  })
);

/**
 * @route   DELETE /api/vectors/cache
 * @desc    Clear vector cache
 * @access  Private
 */
router.delete(
  '/cache', 
  asyncHandler((req, res) => {
    // In a real app, this would actually clear vector cache from database
    // For demo purposes, just simulating success
    
    res.json({
      success: true,
      message: 'Vector cache cleared successfully'
    });
  })
);

/**
 * @route   POST /api/vectors/search
 * @desc    Search vectors across all projects
 * @access  Private
 */
router.post(
  '/search',
  validateRequest({
    body: vectorValidation.searchVectors.body
  }),
  asyncHandler(async (req, res) => {
    const { query, limit = 10, threshold = 0.7 } = req.body;
    
    // In a real app, this would search the vector database
    // For demo purposes, returning mock results
    
    const results = [
      {
        projectId: 'project-1',
        projectName: 'Sample Project 1',
        matches: [
          {
            file: 'src/components/App.js',
            content: 'function App() { return <div>Hello World</div>; }',
            similarity: 0.92,
            lineNumber: 15
          },
          {
            file: 'src/utils/helpers.js',
            content: 'export const formatDate = (date) => { return new Date(date).toLocaleDateString(); }',
            similarity: 0.85,
            lineNumber: 23
          }
        ]
      },
      {
        projectId: 'project-2',
        projectName: 'Sample Project 2',
        matches: [
          {
            file: 'lib/utils.js',
            content: 'const getUser = async (id) => { return await db.users.findOne({ id }); }',
            similarity: 0.78,
            lineNumber: 42
          }
        ]
      }
    ];
    
    res.json({
      success: true,
      query,
      results
    });
  })
);

/**
 * @route   GET /api/vectors/projects/:projectId/status
 * @desc    Get vectorization status for a specific project
 * @access  Private
 */
router.get(
  '/projects/:projectId/status',
  validateRequest(vectorValidation.getVectorizationStatus),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    // Reuse the controller method
    await projectController.getVectorizationStatus(req, res);
  })
);

/**
 * @route   POST /api/vectors/projects/:projectId/vectorize
 * @desc    Start vectorization for a specific project
 * @access  Private
 */
router.post(
  '/projects/:projectId/vectorize',
  validateRequest(vectorValidation.startVectorization),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    // Reuse the controller method
    await projectController.startVectorization(req, res);
  })
);

/**
 * @route   GET /api/vectors/projects/:projectId/data
 * @desc    Get vector data for a specific project
 * @access  Private
 */
router.get(
  '/projects/:projectId/data',
  validateRequest(vectorValidation.getVectorData),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    // Reuse the controller method
    await projectController.getVectorData(req, res);
  })
);

/**
 * @route   GET /api/vectors/projects/:projectId/languages
 * @desc    Get vector languages for a specific project
 * @access  Private
 */
router.get(
  '/projects/:projectId/languages',
  validateRequest(vectorValidation.getVectorLanguages),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    // Reuse the controller method
    await projectController.getVectorLanguages(req, res);
  })
);

module.exports = router; 