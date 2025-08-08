const { User } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set in environment variables. Using default secret.');
  process.env.JWT_SECRET = 'your_secure_jwt_secret_should_be_set_in_env';
}
const { body } = require('express-validator');
const { sanitizeBody } = require('express-validator');

// Rate limiting configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: { 
    success: false,
    error: 'Too many login attempts. Please try again later.'
  },
  skipSuccessfulRequests: true
});

// Helper function to set CORS headers
const setCorsHeaders = (res, req) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : [];
  
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '8h' }
  );
};

// Login handler
const login = async (req, res) => {
  try {
    console.log('Login request received:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    // Set CORS headers
    setCorsHeaders(res, req);
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Clear any existing authentication
    res.clearCookie('token');
    
    // Validate input
    console.log('Validating input...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { email, password, role = 'admin' } = req.body;
    
    // Handle both email and username fields (frontend compatibility)
    const loginEmail = ((email || req.body.username) || '').toLowerCase().trim();
    
    if (!loginEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    if (!loginEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }
    
    // Find user by email
    console.log('Looking up user with:', { email: loginEmail, role });
    const startTime = Date.now();
    
    try {
      const user = await User.findOne({ 
        where: { 
          email: loginEmail,
          role: role
        } 
      });
      
      console.log(`User lookup took ${Date.now() - startTime}ms`);
      
      if (user) {
        console.log('User found:', { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        });
        
        // Check password verification performance
        const pwdStart = Date.now();
        const isMatch = await user.verifyPassword(password);
        console.log(`Password verification took ${Date.now() - pwdStart}ms`);
        
        if (!isMatch) {
          console.log('Invalid password for user:', loginEmail);
          return null;
        }
        
        try {
          // Log before JWT generation
          console.log('Generating JWT token...');
          const tokenStart = Date.now();
          
          // Generate JWT token
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '8h' }
          );
          
          console.log(`JWT generation took ${Date.now() - tokenStart}ms`);
          
          // Log before setting cookie
          console.log('Setting response cookie...');
          const cookieStart = Date.now();
          
          // Set secure cookie
          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
          });
          
          console.log(`Cookie set in ${Date.now() - cookieStart}ms`);
          
          // Log before sending response
          console.log('Sending successful login response');
          
          // Prepare user data for response
          const userData = {
            id: user.id,
            username: user.email, // Frontend expects username
            email: user.email,
            role: user.role,
            name: user.name || user.email.split('@')[0] // Fallback to email prefix if name not set
          };
          
          // Set token in cookie
          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
          });
          
          // Send response with user data and token
          res.status(200).json({
            success: true,
            user: userData,
            token: token, // Include token in response for client-side use
            sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours in ms
          });
          
          return null; // Prevent further processing
          
        } catch (error) {
          console.error('Error in login response handling:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Internal server error during login processing'
            });
          }
          return null;
        }
      } else {
        console.log('No user found with email:', loginEmail);
        return null;
      }
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
    
    // Generic error message to prevent user enumeration
    const invalidCredentials = {
      success: false,
      error: 'Invalid email or password'
    };
    
    if (!user) {
      // Use setTimeout to mitigate timing attacks
      await new Promise(resolve => setTimeout(resolve, 200));
      return res.status(401).json(invalidCredentials);
    }
    
    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json(invalidCredentials);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set secure cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    // Return success response without sensitive data
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
    
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      request: {
        body: req.body,
        headers: req.headers
      }
    });
    
    // More detailed error response for debugging
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout handler
const logout = (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    res.json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during logout'
    });
  }
};

// Get current session handler
const getSession = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(200).json({
        authenticated: false,
        user: null,
        message: 'No user in session'
      });
    }
    
    // Get fresh user data from database
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'role', 'name'] // Removed username as it doesn't exist
    });
    
    if (!user) {
      console.log('User not found in database');
      return res.status(200).json({
        authenticated: false,
        user: null,
        message: 'User not found'
      });
    }
    
    // Calculate token expiration time (8 hours from now)
    const expiresIn = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const expiresAt = new Date(Date.now() + expiresIn);
    
    // Use email as username if username is not available
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || user.email.split('@')[0],
      username: user.email // Use email as username
    };
    
    console.log('Session verified for user:', userData.email);
    
    res.json({
      authenticated: true,
      user: userData,
      expiresIn,
      expiresAt: expiresAt.toISOString()
    });
    
  } catch (error) {
    console.error('Session error:', error);
    res.status(200).json({
      authenticated: false,
      user: null,
      error: 'Session check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get password requirements
const getPasswordRequirements = (req, res) => {
  try {
    res.json({
      success: true,
      requirements: User.getPasswordRequirements()
    });
  } catch (error) {
    console.error('Error getting password requirements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get password requirements'
    });
  }
};

// Middleware to check authentication
const requireAuth = (roles = []) => {
  return [
    // JWT verification middleware
    (req, res, next) => {
      try {
        const token = req.cookies.token || 
                     req.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        
        // Check role if required
        if (roles.length && !roles.includes(decoded.role)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }
        
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Session expired. Please log in again.'
          });
        }
        
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    }
  ];
};

// Export all the functions
module.exports = {
  login: [loginLimiter, ...User.validate('login'), login],
  logout,
  getSession,
  getPasswordRequirements,
  requireAuth,
  validate: User.validate
};