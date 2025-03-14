const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes - requires valid JWT token
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Not authorized - no token provided' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    try {
      // Verify the token using the JWT_SECRET or a fallback for development
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Check if user exists in Supabase
      const { data: user, error } = await req.supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Not authorized - user not found' });
      }

      // Add user to request object
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: 'Not authorized - invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Conditional authentication middleware
 * If a valid token is provided, authenticate the user
 * If no token or invalid token, still allow access but without user info
 */
const conditionalProtect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // If no token or not a Bearer token, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Try to verify token
    try {
      // Verify the token using the JWT_SECRET or a fallback for development
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Check if user exists in Supabase
      const { data: user, error } = await req.supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (!error && user) {
        // Add user to request object
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    } catch (error) {
      // Ignore token errors in conditional auth
      console.warn('Token verification warning (ignored):', error.message);
    }

    // Continue regardless of authentication result
    next();
  } catch (error) {
    console.error('Conditional auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { protect, conditionalProtect }; 