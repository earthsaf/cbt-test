const db = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { validationResult, body } = require('express-validator');

// Password validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const User = {
  // Find user by email and role
  async findOne({ email, role }) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND role = $2';
      const { rows } = await db.query(query, [email, role]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding user:', error);
      throw new Error('Error finding user');
    }
  },
  
  // Create new user with hashed password
  async create(userData) {
    try {
      const { email, password, role, name } = userData;
      
      // Validate password strength
      if (!this.isPasswordValid(password)) {
        throw new Error('Password does not meet requirements');
      }
      
      const hashedPassword = await this.hashPassword(password);
      const userId = uuidv4();
      
      const query = `
        INSERT INTO users (id, email, password_hash, role, name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, role, name, created_at, updated_at
      `;
      
      const { rows } = await db.query(query, [
        userId,
        email.toLowerCase().trim(),
        hashedPassword,
        role,
        name.trim()
      ]);
      
      return rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Find user by primary key (id)
  async findByPk(id) {
    try {
      const query = 'SELECT id, email, role, name, created_at, updated_at FROM users WHERE id = $1';
      const { rows } = await db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw new Error('Error finding user');
    }
  },
  
  // Find user by email only
  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const { rows } = await db.query(query, [email.toLowerCase().trim()]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Error finding user');
    }
  },
  
  // Password hashing
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Error processing password');
    }
  },
  
  // Password verification
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw new Error('Error verifying credentials');
    }
  },
  
  // Password validation
  isPasswordValid(password) {
    if (typeof password !== 'string') return false;
    if (password.length < PASSWORD_MIN_LENGTH) return false;
    if (!PASSWORD_REGEX.test(password)) return false;
    return true;
  },
  
  // Get password requirements for client-side validation
  getPasswordRequirements() {
    return {
      minLength: PASSWORD_MIN_LENGTH,
      requiresUppercase: true,
      requiresLowercase: true,
      requiresNumber: true,
      requiresSpecialChar: true,
      description: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and include uppercase, lowercase, number, and special character`
    };
  }
};

// Input validation middleware
User.validate = (method) => {
  switch (method) {
    case 'login': {
      return [
        body('email')
          .isEmail().withMessage('Please provide a valid email')
          .normalizeEmail(),
        body('password')
          .isLength({ min: PASSWORD_MIN_LENGTH })
          .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
      ];
    }
    case 'register': {
      return [
        body('email')
          .isEmail().withMessage('Please provide a valid email')
          .normalizeEmail(),
        body('password')
          .isLength({ min: PASSWORD_MIN_LENGTH })
          .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
          .matches(PASSWORD_REGEX)
          .withMessage('Password must include uppercase, lowercase, number, and special character'),
        body('name')
          .trim()
          .isLength({ min: 2 })
          .withMessage('Name must be at least 2 characters long'),
        body('role')
          .isIn(['student', 'teacher', 'admin'])
          .withMessage('Invalid role')
      ];
    }
  }
};

module.exports = User;