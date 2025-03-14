const Joi = require('joi');

const authValidation = {
  // Register validation schema
  register: {
    body: Joi.object({
      username: Joi.string().min(3).max(30).required()
        .messages({
          'string.empty': 'Username is required',
          'string.min': 'Username must be at least 3 characters long',
          'string.max': 'Username cannot exceed 30 characters',
          'any.required': 'Username is required'
        }),
      email: Joi.string().email().required()
        .messages({
          'string.empty': 'Email is required',
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
      password: Joi.string().min(8).required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .messages({
          'string.empty': 'Password is required',
          'string.min': 'Password must be at least 8 characters long',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          'any.required': 'Password is required'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
        .messages({
          'string.empty': 'Confirm password is required',
          'any.only': 'Passwords do not match',
          'any.required': 'Confirm password is required'
        })
    })
  },

  // Login validation schema
  login: {
    body: Joi.object({
      email: Joi.string().email().required()
        .messages({
          'string.empty': 'Email is required',
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
      password: Joi.string().required()
        .messages({
          'string.empty': 'Password is required',
          'any.required': 'Password is required'
        })
    })
  },

  // Refresh token validation schema
  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required()
        .messages({
          'string.empty': 'Refresh token is required',
          'any.required': 'Refresh token is required'
        })
    })
  },

  // Reset password request validation schema
  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required()
        .messages({
          'string.empty': 'Email is required',
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        })
    })
  },

  // Reset password validation schema
  resetPassword: {
    body: Joi.object({
      token: Joi.string().required()
        .messages({
          'string.empty': 'Reset token is required',
          'any.required': 'Reset token is required'
        }),
      password: Joi.string().min(8).required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .messages({
          'string.empty': 'Password is required',
          'string.min': 'Password must be at least 8 characters long',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          'any.required': 'Password is required'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
        .messages({
          'string.empty': 'Confirm password is required',
          'any.only': 'Passwords do not match',
          'any.required': 'Confirm password is required'
        })
    })
  },

  // Change password validation schema
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required()
        .messages({
          'string.empty': 'Current password is required',
          'any.required': 'Current password is required'
        }),
      newPassword: Joi.string().min(8).required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .messages({
          'string.empty': 'New password is required',
          'string.min': 'New password must be at least 8 characters long',
          'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
          'any.required': 'New password is required'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
        .messages({
          'string.empty': 'Confirm password is required',
          'any.only': 'Passwords do not match',
          'any.required': 'Confirm password is required'
        })
    })
  }
};

module.exports = authValidation; 