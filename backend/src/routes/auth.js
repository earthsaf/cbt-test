const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validation');

// Parse JSON bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['student', 'teacher', 'admin']),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const { email, password, name, role } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
      
      // Create new user
      const user = await User.create({ email, password, name, role });
      
      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      // Set secure cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });
      
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user / clear cookie
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authController.requireAuth(),
  (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  }
);

/**
 * @route   GET /api/auth/session
 * @desc    Get current session info
 * @access  Private
 */
router.get(
  '/session',
  authController.requireAuth(),
  authController.getSession
);

/**
 * @route   GET /api/auth/password-requirements
 * @desc    Get password requirements
 * @access  Public
 */
router.get('/password-requirements', authController.getPasswordRequirements);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Auth route error:', err);
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = router;

// Test endpoint to check admin user
router.get('/test-admin', async (req, res) => {
  try {
    const admin = await User.findOne({ where: { role: 'admin', username: 'admin' } });
    res.json({ 
      adminExists: !!admin,
      adminDetails: admin ? {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        name: admin.name,
        email: admin.email
      } : null
    });
  } catch (error) {
    console.error('Test admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth API is working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Simple auth check endpoint that doesn't require middleware
router.get('/check', async (req, res) => {
  console.log('Auth check endpoint called');
  console.log('Cookies:', req.cookies);
  
  try {
    const token = req.cookies && req.cookies.token;
    console.log('Token found:', !!token);
    
    if (!token) {
      console.log('No token found in cookies');
      return res.json({ 
        success: false, 
        authenticated: false,
        message: 'No token found'
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified, payload:', payload);
    
    const user = await User.findByPk(payload.id);
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('User not found in database');
      return res.json({ 
        success: false, 
        authenticated: false,
        message: 'User not found'
      });
    }

    console.log('Authentication successful for user:', user.username);
    res.json({ 
      success: true, 
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name || user.username
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.json({ 
      success: false, 
      authenticated: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router;