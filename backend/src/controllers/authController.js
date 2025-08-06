const User = require('../models/user');
const bcrypt = require('bcryptjs');

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
    
    // Clear any existing authentication
    if (req.cookies && req.cookies.token) {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    
    console.log('Login attempt:', { 
      username: req.body.username,
      role: req.body.role,
      examId: req.body.examId ? 'provided' : 'not provided'
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
    
    console.log('Looking for user with:', { username, role });
    const user = await User.findOne({ 
      where: { 
        username,
        role
      } 
    });
    
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found:', { username, role });
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or role' 
      });
    }
    
    console.log('Comparing password for user:', username);
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }
    
    // Set user info in session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.json({ 
      message: 'Logged in successfully',
      user: {
        username: user.username,
        role: user.role
      }
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
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
};

exports.getSession = (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'No active session' });
  }
};