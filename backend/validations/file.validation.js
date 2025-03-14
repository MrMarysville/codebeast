/**
 * Validation schemas for file routes
 */
const Joi = require('joi');

// Schema for uploading a file
const uploadFile = {
  params: Joi.object({
    projectId: Joi.string().required()
  }),
  query: Joi.object({
    filePath: Joi.string().allow('', null)
  })
};

// Schema for uploading a ZIP file
const uploadZip = {
  params: Joi.object({
    projectId: Joi.string().required()
  }),
  query: Joi.object({
    extractPath: Joi.string().allow('', null).default('')
  })
};

// Schema for downloading a file
const downloadFile = {
  params: Joi.object({
    projectId: Joi.string().required(),
    filePath: Joi.string().required()
  })
};

// Schema for creating a directory
const createDirectory = {
  params: Joi.object({
    projectId: Joi.string().required()
  }),
  body: Joi.object({
    dirPath: Joi.string().required()
      .messages({
        'string.empty': 'Directory path cannot be empty',
        'any.required': 'Directory path is required'
      })
  })
};

module.exports = {
  uploadFile,
  uploadZip,
  downloadFile,
  createDirectory
}; 