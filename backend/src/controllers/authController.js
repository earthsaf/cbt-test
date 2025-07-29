const { User, Exam } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  try {
    console.log('Login attempt:', { 
      ...req.body, 
      password: req.body.password ? '[HIDDEN]' : 'undefined' 
    });
    
    const { username, password, role, examId, invigilatorCode } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
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
    
    // Handle regular user login (admin/teacher)
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role specified' 
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
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });
    
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
  res.clearCookie('token', {
    httpOnly: true,
    secure: true, // Always secure for cross-site
    sameSite: 'none', // Always none for cross-site
  });
  res.json({ success: true });
};

// Test authentication endpoint
exports.testAuth = async (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      classId: req.user.ClassId
    }
  });
};