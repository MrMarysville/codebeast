/**
 * Validation schemas for feature routes
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

// Schema for feature ID parameter
const featureIdParam = Joi.object({
  projectId: Joi.string().required(),
  featureId: Joi.string().required()
    .messages({
      'string.empty': 'Feature ID cannot be empty',
      'any.required': 'Feature ID is required'
    })
});

// Schema for creating a feature
const createFeature = {
  params: projectIdParam,
  body: Joi.object({
    name: Joi.string().required().min(1).max(100)
      .messages({
        'string.empty': 'Feature name cannot be empty',
        'string.min': 'Feature name must be at least {#limit} characters long',
        'string.max': 'Feature name cannot exceed {#limit} characters',
        'any.required': 'Feature name is required'
      }),
    description: Joi.string().allow('', null).max(500)
      .messages({
        'string.max': 'Feature description cannot exceed {#limit} characters'
      }),
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold').default('planned')
      .messages({
        'any.only': 'Feature status must be one of: planned, in_progress, completed, on_hold'
      }),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
      .messages({
        'any.only': 'Feature priority must be one of: low, medium, high'
      }),
    components: Joi.array().items(Joi.string()).default([])
  })
};

// Schema for updating a feature
const updateFeature = {
  params: featureIdParam,
  body: Joi.object({
    name: Joi.string().min(1).max(100)
      .messages({
        'string.empty': 'Feature name cannot be empty',
        'string.min': 'Feature name must be at least {#limit} characters long',
        'string.max': 'Feature name cannot exceed {#limit} characters'
      }),
    description: Joi.string().allow('', null).max(500)
      .messages({
        'string.max': 'Feature description cannot exceed {#limit} characters'
      }),
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold')
      .messages({
        'any.only': 'Feature status must be one of: planned, in_progress, completed, on_hold'
      }),
    priority: Joi.string().valid('low', 'medium', 'high')
      .messages({
        'any.only': 'Feature priority must be one of: low, medium, high'
      }),
    components: Joi.array().items(Joi.string())
  })
};

// Schema for deleting a feature
const deleteFeature = {
  params: featureIdParam
};

// Schema for getting a feature by ID
const getFeatureById = {
  params: featureIdParam
};

// Schema for getting all features
const getAllFeatures = {
  params: projectIdParam,
  query: Joi.object({
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    search: Joi.string().allow('', null),
    sort: Joi.string().valid('name', 'status', 'priority', 'created', 'updated').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc')
  })
};

// Schema for adding a component to a feature
const addComponentToFeature = {
  params: featureIdParam,
  body: Joi.object({
    componentId: Joi.string().required()
      .messages({
        'string.empty': 'Component ID cannot be empty',
        'any.required': 'Component ID is required'
      })
  })
};

// Schema for removing a component from a feature
const removeComponentFromFeature = {
  params: Joi.object({
    projectId: Joi.string().required(),
    featureId: Joi.string().required(),
    componentId: Joi.string().required()
      .messages({
        'string.empty': 'Component ID cannot be empty',
        'any.required': 'Component ID is required'
      })
  })
};

module.exports = {
  createFeature,
  updateFeature,
  deleteFeature,
  getFeatureById,
  getAllFeatures,
  addComponentToFeature,
  removeComponentFromFeature
}; 