/**
 * Validation schemas for vector routes
 */
const Joi = require('joi');

// Schema for project ID parameter
const projectIdParam = Joi.object({
  projectId: Joi.string().required()
    .messages({
      'string.empty': 'Project ID cannot be empty',
      'any.required': 'Project ID is required'
    })
});

// Schema for getting vectorization status
const getVectorizationStatus = {
  params: projectIdParam
};

// Schema for starting vectorization
const startVectorization = {
  params: projectIdParam,
  body: Joi.object({
    options: Joi.object({
      includeComments: Joi.boolean().default(true),
      chunkSize: Joi.number().integer().min(50).max(1000).default(150),
      overlapSize: Joi.number().integer().min(0).max(100).default(20)
    }).default({})
  }).default({})
};

// Schema for getting vector data
const getVectorData = {
  params: projectIdParam,
  query: Joi.object({
    format: Joi.string().valid('json', 'csv').default('json'),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  }).default({})
};

// Schema for getting vector languages
const getVectorLanguages = {
  params: projectIdParam
};

// Schema for searching vectors
const searchVectors = {
  params: projectIdParam,
  body: Joi.object({
    query: Joi.string().required().min(1).max(500)
      .messages({
        'string.empty': 'Search query cannot be empty',
        'string.min': 'Search query must be at least {#limit} characters long',
        'string.max': 'Search query cannot exceed {#limit} characters',
        'any.required': 'Search query is required'
      }),
    limit: Joi.number().integer().min(1).max(100).default(10),
    threshold: Joi.number().min(0).max(1).default(0.7)
  })
};

// Schema for getting vector statistics
const getVectorStats = {
  params: projectIdParam
};

module.exports = {
  getVectorizationStatus,
  startVectorization,
  getVectorData,
  getVectorLanguages,
  searchVectors,
  getVectorStats
}; 