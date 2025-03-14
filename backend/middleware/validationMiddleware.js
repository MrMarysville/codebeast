/**
 * Validation middleware for request data
 * Uses Joi for schema validation
 */
const Joi = require('joi');
const { ApiError } = require('./errorMiddleware');

/**
 * Validates request data against a Joi schema
 * @param {Object} schema - Joi schema object with body, query, params
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: false // Don't remove unknown props
    };

    // Validate request body if schema.body is provided
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          message: detail.message,
          path: detail.path
        }));
        
        return next(new ApiError('Invalid request data', 400, errorDetails));
      }
      
      // Replace req.body with validated value
      req.body = value;
    }

    // Validate request query parameters if schema.query is provided
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          message: detail.message,
          path: detail.path
        }));
        
        return next(new ApiError('Invalid query parameters', 400, errorDetails));
      }
      
      // Replace req.query with validated value
      req.query = value;
    }

    // Validate request path parameters if schema.params is provided
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          message: detail.message,
          path: detail.path
        }));
        
        return next(new ApiError('Invalid path parameters', 400, errorDetails));
      }
      
      // Replace req.params with validated value
      req.params = value;
    }

    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  id: Joi.string().uuid().required(),
  
  projectId: Joi.string().required(),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  
  createProject: Joi.object({
    name: Joi.string().required().min(1).max(100),
    description: Joi.string().allow('', null).max(500)
  }),
  
  updateProject: Joi.object({
    name: Joi.string().min(1).max(100),
    description: Joi.string().allow('', null).max(500)
  }),
  
  filePath: Joi.string().required().min(1),
  
  fileContent: Joi.object({
    content: Joi.string().required()
  })
};

module.exports = {
  validateRequest,
  schemas
}; 