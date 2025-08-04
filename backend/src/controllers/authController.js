const { User, Exam } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Helper function to set CORS headers
const setCorsHeaders = (res, req) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
};

exports.login = async (req, res) => {
  try {
    // Set CORS headers for all responses
    setCorsHeaders(res, req);
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('Login attempt:', { 
      ...req.body, 
      password: req.body.password ? '[HIDDEN]' : 'undefined',
      headers: req.headers
    });
    
    const { username, password, role, examId, invigilatorCode } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // Handle invigilator login
    if (role === 'invigilator') {
      if (!examId || !invigilatorCode) {
        return res.status(400).json({ 
          success: false,
          error: 'Exam ID and invigilator code are required' 
        });
      }
      
      const exam = await Exam.findByPk(examId);
      if (!exam) {
        console.log('Exam not found:', examId);
        return res.status(404).json({ 
          success: false,
          error: 'Exam not found' 
        });
      }
      
      if (exam.invigilatorCode !== invigilatorCode) {
        console.log('Invalid invigilator code for exam:', examId);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid invigilator code' 
        });
      }
      
      const token = jwt.sign({ role: 'invigilator', examId }, process.env.JWT_SECRET, { 
        expiresIn: '4h' 
      });
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 4 * 60 * 60 * 1000
      });
      
      return res.json({ 
        success: true,
        user: { role: 'invigilator', examId }
      });
    }
    
    // Handle regular user login (admin/teacher/student)
    if (!['admin', 'teacher', 'student'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role specified. Role must be admin, teacher, or student.' 
      });
    }
    
    const user = await User.findOne({ 
      where: { 
        username,
        role
      } 
    });
    
    if (!user) {
      console.log('User not found:', { username, role });
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or role' 
      });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role,
        name: user.name || user.username
      }, 
      process.env.JWT_SECRET, 
      { 
        expiresIn: '8h' 
      }
    );
    
    // Set cookie with secure settings
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only secure in production
      sameSite: isProduction ? 'none' : 'lax', // None for cross-site in production
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/',
      domain: isProduction ? '.onrender.com' : undefined // Set domain in production
    };
    
    console.log('Setting cookie with options:', cookieOptions);
    res.cookie('token', token, cookieOptions);
    
    // Set CORS headers for the response
    setCorsHeaders(res, req);
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        name: user.name || user.username
      },
      token // Also send token in response for clients that need it
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred during login. Please try again.'
    });
  }
};

exports.logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Clear the cookie with the same options it was set with
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    domain: isProduction ? '.onrender.com' : undefined
  });
  
  // Set CORS headers for the response
  setCorsHeaders(res, req);
  
  res.json({ 
    success: true,
    message: 'Successfully logged out'
  });
};

// Test authentication endpoint
exports.testAuth = async (req, res) => {
  try {
    console.log('testAuth: Checking authentication for user:', req.user);
    
    if (!req.user || !req.user.id) {
      console.error('testAuth: No user ID in request');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    // Get fresh user data from the database
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'role', 'name', 'email', 'classId']
    });
    
    if (!user) {
      console.error('testAuth: User not found in database');
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    console.log('testAuth: User found:', {
      id: user.id,
      username: user.username,
      role: user.role
    });

    // Check if user is admin
    if (user.role !== 'admin') {
      console.error('testAuth: User is not an admin');
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        classId: user.classId || null
      }
    });
  } catch (error) {
    console.error('Error in testAuth:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};