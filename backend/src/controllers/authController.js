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
  const requestId = uuidv4();
  const logContext = { requestId, timestamp: new Date().toISOString() };
  
  try {
    console.log('=== LOGIN REQUEST STARTED ===', {
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: { ...req.body, password: req.body.password ? '***' : undefined },
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '***' : undefined,
        cookie: req.headers.cookie ? '***' : undefined
      }
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
          
          // Set secure cookie with proper cross-origin settings
          const isProduction = process.env.NODE_ENV === 'production';
          const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax', // Use 'none' in production for cross-site cookies
            maxAge: 8 * 60 * 60 * 1000, // 8 hours
            domain: isProduction ? '.cbt-test.onrender.com' : undefined,
            path: '/',
          };
          
          // Log cookie options for debugging
          console.log('Setting cookie with options:', JSON.stringify(cookieOptions, null, 2));
          
          res.cookie('token', token, cookieOptions);
          
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
    console.log('Generating JWT token...', { ...logContext, userId: user.id, role: user.role });
    const token = generateToken(user);
    
    // Set secure cookie with token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.cbt-test.onrender.com' : undefined
    };
    
    console.log('Setting auth cookie with options:', { ...logContext, cookieOptions });
    res.cookie('token', token, cookieOptions);
    
    // Log response headers for debugging
    console.log('Response headers set:', { 
      ...logContext,
      headers: Object.entries(res.getHeaders())
        .filter(([key]) => key.toLowerCase() === 'set-cookie')
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
    const errorContext = {
      ...logContext,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        } : undefined
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        body: { ...req.body, password: req.body?.password ? '***' : undefined },
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        headers: {
          ...req.headers,
          authorization: req.headers.authorization ? '***' : undefined,
          cookie: req.headers.cookie ? '***' : undefined
        }
      }
    };
    
    console.error('!!! AUTHENTICATION ERROR !!!', errorContext);
    
    // More detailed error response for debugging
    const errorResponse = {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      requestId,
      timestamp: logContext.timestamp,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        name: error.name,
        ...(error.response?.data ? { response: error.response.data } : {})
      } : undefined
    };
    
    res.status(500).json(errorResponse);
  }
};

// Logout handler
const logout = (req, res) => {
  const requestId = uuidv4();
  const logContext = { requestId, timestamp: new Date().toISOString() };
  
  console.log('=== LOGOUT REQUEST ===', {
    ...logContext,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    cookies: req.cookies || {},
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '***' : undefined,
      cookie: req.headers.cookie ? '***' : undefined
    }
  });
  try {
    // Clear the token cookie with matching options
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: isProduction ? '.cbt-test.onrender.com' : undefined
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
  const requestId = uuidv4();
  const logContext = { requestId, timestamp: new Date().toISOString() };
  
  // Log incoming request details
  const sessionLog = {
    ...logContext,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    cookies: req.cookies || {},
    user: req.user || null,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '***' : undefined,
      cookie: req.headers.cookie ? '***' : undefined
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN
    }
  };
  
  console.log('=== SESSION VERIFICATION REQUEST ===', sessionLog);
  
  try {
    // Check if user is authenticated via session
    if (!req.user || !req.user.id) {
      console.log('No user in session - checking for token in cookies');
      
      // If no user in session but we have a token in cookies, try to authenticate
      const token = req.cookies?.token;
      if (token) {
        console.log('Found token in cookies, attempting to authenticate...');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('Decoded token:', { userId: decoded.id, role: decoded.role });
          
          // Get fresh user data
          const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'email', 'role', 'name']
          });
          
          if (user) {
            console.log('User found from token:', { userId: user.id, email: user.email });
            
            // Generate new token to refresh expiration
            const newToken = generateToken(user);
            const isProduction = process.env.NODE_ENV === 'production';
            
            // Set secure cookie with token
            const cookieOptions = {
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? 'none' : 'lax',
              maxAge: 8 * 60 * 60 * 1000, // 8 hours
              path: '/',
              domain: isProduction ? '.cbt-test.onrender.com' : undefined
            };
            
            console.log('Refreshing session cookie with options:', { ...logContext, cookieOptions });
            res.cookie('token', newToken, cookieOptions);
            
            // Return user data
            const userData = {
              id: user.id,
              email: user.email,
              role: user.role,
              name: user.name || user.email.split('@')[0],
              username: user.email
            };
            
            return res.json({
              authenticated: true,
              user: userData,
              token: newToken,
              expiresIn: 8 * 60 * 60 * 1000,
              expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
            });
          }
        } catch (tokenError) {
          console.error('Token verification failed:', {
            ...logContext,
            error: tokenError.message,
            stack: tokenError.stack
          });
          // Clear invalid token
          res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.cbt-test.onrender.com' : undefined
          });
        }
      }
      
      return res.status(200).json({
        authenticated: false,
        user: null,
        message: 'No active session',
        requestId
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