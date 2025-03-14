/**
 * Error handling middleware for the application
 * Provides consistent error responses and logging
 */

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found error handler - for routes that don't exist
const notFound = (req, res, next) => {
  const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log the error with details
  console.error('ERROR DETAILS:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user.id : 'unauthenticated'
  });

  // Set status code
  const statusCode = err.statusCode || 500;
  
  // Prepare response
  const response = {
    success: false,
    error: {
      message: err.message || 'Server Error',
      status: statusCode,
      ...(err.details && { details: err.details })
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  // Send response
  res.status(statusCode).json(response);
};

// Async handler to avoid try/catch blocks in controllers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  ApiError
}; 