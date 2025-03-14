const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { validateRequest } = require('../middleware/validationMiddleware');
const authValidation = require('../validations/auth.validation');
const { asyncHandler, ApiError } = require('../middleware/errorMiddleware');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  // For demo purposes, we'll allow requests to proceed
  // In a real app, you would check session/token validity
  next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register', 
  validateRequest(authValidation.register),
  asyncHandler(async (req, res) => {
    const { email, password, username: name } = req.body;

    // Check if user exists (would connect to Supabase in production)
    const { data: existingUsers, error: checkError } = await req.supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (checkError) {
      throw new ApiError(`Failed to check existing users: ${checkError.message}`, 500);
    }
    
    if (existingUsers && existingUsers.length > 0) {
      throw new ApiError('User with this email already exists', 400);
    }

    // Create new user
    const userId = uuidv4();
    const { data: newUser, error: createError } = await req.supabase
      .from('users')
      .insert([
        { 
          id: userId, 
          email, 
          name: name || email.split('@')[0],
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) {
      throw new ApiError(`Failed to create user: ${createError.message}`, 500);
    }

    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login', 
  validateRequest(authValidation.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists
    const { data: users, error } = await req.supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (error) {
      throw new ApiError(`Failed to fetch user: ${error.message}`, 500);
    }
    
    if (!users || users.length === 0) {
      throw new ApiError('Invalid credentials', 401);
    }

    const user = users[0];

    // In a real app, you would verify the password here
    // For demo purposes, we'll pretend the password is correct

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me', 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    // In a real app, you would get the user ID from the authenticated request
    // For demo purposes, we'll return a mock user
    
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      throw new ApiError('Not authenticated', 401);
    }

    const { data: user, error } = await req.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new ApiError(`Failed to fetch user: ${error.message}`, 500);
    }
    
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  })
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh-token',
  validateRequest(authValidation.refreshToken),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    // In a real app, you would verify the refresh token
    // For demo purposes, we'll create a new token
    
    try {
      // Verify the refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      );
      
      // Get user from database
      const { data: user, error } = await req.supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();
        
      if (error || !user) {
        throw new ApiError('Invalid refresh token', 401);
      }
      
      // Create new access token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      throw new ApiError('Invalid refresh token', 401);
    }
  })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  validateRequest(authValidation.forgotPassword),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    // Check if user exists
    const { data: users, error } = await req.supabase
      .from('users')
      .select('*')
      .eq('email', email);
      
    if (error) {
      throw new ApiError(`Failed to check user: ${error.message}`, 500);
    }
    
    // Don't reveal if user exists or not for security
    // Just return success in both cases
    
    // In a real app, you would send an email with reset link
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  validateRequest(authValidation.resetPassword),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    
    // In a real app, you would verify the token and update the password
    // For demo purposes, we'll just return success
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post(
  '/change-password',
  isAuthenticated,
  validateRequest(authValidation.changePassword),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      throw new ApiError('Not authenticated', 401);
    }
    
    // In a real app, you would verify the current password and update to the new one
    // For demo purposes, we'll just return success
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user / clear token
 * @access  Private
 */
router.post(
  '/logout', 
  isAuthenticated,
  asyncHandler((req, res) => {
    // In a real app, you might invalidate the token or clear cookies
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

module.exports = router; 