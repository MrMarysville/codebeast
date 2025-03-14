/**
 * Validation schemas for component routes
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

// Schema for component ID parameter
const componentIdParam = Joi.object({
  projectId: Joi.string().required(),
  componentId: Joi.string().required()
    .messages({
      'string.empty': 'Component ID cannot be empty',
      'any.required': 'Component ID is required'
    })
});

// Schema for creating a component
const createComponent = {
  params: projectIdParam,
  body: Joi.object({
    name: Joi.string().required().min(1).max(100)
      .messages({
        'string.empty': 'Component name cannot be empty',
        'string.min': 'Component name must be at least {#limit} characters long',
        'string.max': 'Component name cannot exceed {#limit} characters',
        'any.required': 'Component name is required'
      }),
    description: Joi.string().allow('', null).max(500)
      .messages({
        'string.max': 'Component description cannot exceed {#limit} characters'
      }),
    type: Joi.string().valid('ui', 'logic', 'data', 'other').default('ui')
      .messages({
        'any.only': 'Component type must be one of: ui, logic, data, other'
      }),
    files: Joi.array().items(Joi.string()).default([])
  })
};

// Schema for updating a component
const updateComponent = {
  params: componentIdParam,
  body: Joi.object({
    name: Joi.string().min(1).max(100)
      .messages({
        'string.empty': 'Component name cannot be empty',
        'string.min': 'Component name must be at least {#limit} characters long',
        'string.max': 'Component name cannot exceed {#limit} characters'
      }),
    description: Joi.string().allow('', null).max(500)
      .messages({
        'string.max': 'Component description cannot exceed {#limit} characters'
      }),
    type: Joi.string().valid('ui', 'logic', 'data', 'other')
      .messages({
        'any.only': 'Component type must be one of: ui, logic, data, other'
      }),
    files: Joi.array().items(Joi.string())
  })
};

// Schema for deleting a component
const deleteComponent = {
  params: componentIdParam
};

// Schema for getting a component by ID
const getComponentById = {
  params: componentIdParam
};

// Schema for getting all components
const getAllComponents = {
  params: projectIdParam,
  query: Joi.object({
    type: Joi.string().valid('ui', 'logic', 'data', 'other'),
    search: Joi.string().allow('', null),
    sort: Joi.string().valid('name', 'created', 'updated').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc')
  })
};

// Schema for adding a file to a component
const addFileToComponent = {
  params: componentIdParam,
  body: Joi.object({
    filePath: Joi.string().required()
      .messages({
        'string.empty': 'File path cannot be empty',
        'any.required': 'File path is required'
      })
  })
};

// Schema for removing a file from a component
const removeFileFromComponent = {
  params: Joi.object({
    projectId: Joi.string().required(),
    componentId: Joi.string().required(),
    filePath: Joi.string().required()
      .messages({
        'string.empty': 'File path cannot be empty',
        'any.required': 'File path is required'
      })
  })
};

module.exports = {
  createComponent,
  updateComponent,
  deleteComponent,
  getComponentById,
  getAllComponents,
  addFileToComponent,
  removeFileFromComponent
}; 