/**
 * Validation schemas for project routes
 */
const Joi = require('joi');

// Schema for project ID parameter
const projectIdParam = Joi.object({
  projectId: Joi.string().required().min(1).max(100)
});

// Schema for creating a new project
const createProject = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required()
      .messages({
        'string.empty': 'Project name cannot be empty',
        'string.min': 'Project name must be at least {#limit} characters long',
        'string.max': 'Project name cannot exceed {#limit} characters',
        'any.required': 'Project name is required'
      }),
    description: Joi.string().allow('', null).max(500)
      .messages({
        'string.max': 'Project description cannot exceed {#limit} characters'
      })
  })
};

// Schema for updating a project
const updateProject = {
  params: projectIdParam,
  body: Joi.object({
    name: Joi.string().min(1).max(100)
      .messages({
        'string.empty': 'Project name cannot be empty',
        'string.min': 'Project name must be at least {#limit} characters long',
        'string.max': 'Project name cannot exceed {#limit} characters'
      }),
    description: Joi.string().allow('', null).max(500)
      .messages({
        'string.max': 'Project description cannot exceed {#limit} characters'
      })
  })
};

// Schema for deleting a project
const deleteProject = {
  params: projectIdParam
};

// Schema for getting a project by ID
const getProjectById = {
  params: projectIdParam
};

// Schema for getting project file tree
const getProjectFileTree = {
  params: projectIdParam
};

// Schema for getting project files
const getProjectFiles = {
  params: projectIdParam,
  query: Joi.object({
    path: Joi.string().allow('', null),
    recursive: Joi.boolean().default(false)
  })
};

// Schema for getting file content
const getFileContent = {
  params: Joi.object({
    projectId: Joi.string().required(),
    filePath: Joi.string().required()
  })
};

// Schema for updating file content
const updateFileContent = {
  params: Joi.object({
    projectId: Joi.string().required(),
    filePath: Joi.string().required()
  }),
  body: Joi.object({
    content: Joi.string().required()
      .messages({
        'string.empty': 'File content cannot be empty',
        'any.required': 'File content is required'
      })
  })
};

// Schema for deleting a file
const deleteFile = {
  params: Joi.object({
    projectId: Joi.string().required(),
    filePath: Joi.string().required()
  })
};

// Schema for starting vectorization
const startVectorization = {
  params: projectIdParam
};

module.exports = {
  createProject,
  updateProject,
  deleteProject,
  getProjectById,
  getProjectFileTree,
  getProjectFiles,
  getFileContent,
  updateFileContent,
  deleteFile,
  startVectorization
}; 