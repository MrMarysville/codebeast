/**
 * Rate limiting middleware to prevent abuse
 */
const rateLimit = require('express-rate-limit');
const { ApiError } = require('./errorMiddleware');

// Default rate limit options
const defaultOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    next(new ApiError('Too many requests, please try again later.', 429, {
      retryAfter: Math.ceil(options.windowMs / 1000),
      limit: options.max,
      windowMs: options.windowMs
    }));
  }
};

// General API rate limiter
const apiLimiter = rateLimit({
  ...defaultOptions,
  max: 300, // Higher limit for general API
  skipSuccessfulRequests: false // Count all requests
});

// Auth endpoints rate limiter (more strict)
const authLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // Limit each IP to 20 requests per hour
  message: 'Too many authentication attempts, please try again after an hour',
  skipSuccessfulRequests: false // Count all requests
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again after an hour',
  skipSuccessfulRequests: true // Only count failed requests
});

// Vectorization rate limiter
const vectorizationLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 vectorization requests per hour
  message: 'Too many vectorization requests, please try again after an hour',
  skipSuccessfulRequests: true // Only count failed requests
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  vectorizationLimiter
}; 