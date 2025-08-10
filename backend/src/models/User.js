const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');

// Password validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

class User extends Model {
  // Instance method to verify password
  async verifyPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password_hash);
  }

  // Instance method to validate password format
  isPasswordValid(password) {
    if (typeof password !== 'string') return false;
    if (password.length < PASSWORD_MIN_LENGTH) return false;
    if (!PASSWORD_REGEX.test(password)) return false;
    return true;
  }

  // Static method to hash password
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Static method to get password requirements
  static getPasswordRequirements() {
    return {
      minLength: PASSWORD_MIN_LENGTH,
      requiresUppercase: true,
      requiresLowercase: true,
      requiresNumber: true,
      requiresSpecialChar: true,
      description: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and include uppercase, lowercase, number, and special character`
    };
  }

  // Static method to find user by email
  static async findByEmail(email) {
    return await this.findOne({ where: { email } });
  }

  // Static method for validation rules (legacy support)
  static validate(method) {
    return this.getValidationRules(method);
  }

  // Define model associations
  static associate(models) {
    // A User (teacher) can have many TeacherClassSubject assignments
    User.hasMany(models.TeacherClassSubject, {
      foreignKey: 'teacherId',
      as: 'teacherAssignments'
    });
    
    // A User can belong to a Class (for students)
    User.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
  }

  // Static method for validation rules
  static getValidationRules(method) {
    switch (method) {
      case 'login': {
        return [
          // Handle both email and username fields
          body(['email', 'username'])
            .optional({ checkFalsy: true })
            .custom((value, { req }) => {
              // If email is not provided but username is, use it as email
              if (!req.body.email && req.body.username) {
                req.body.email = req.body.username;
              }
              // If email is just '@', it's invalid
              if (req.body.email === '@') {
                throw new Error('Please provide a valid email');
              }
              return true;
            }),
          // Email validation (after potential username copy)
          body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email')
            .normalizeEmail(),
          // Password is always required
          body('password')
            .notEmpty().withMessage('Password is required')
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
            .notEmpty().withMessage('Name is required')
            .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
          body('role')
            .isIn(['admin', 'teacher', 'student'])
            .withMessage('Invalid role')
        ];
      }
      default:
        return [];
    }
  }

  // Initialize the model
  static initialize(sequelize) {
    return this.init({
      // Basic info
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      telegramId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        field: 'telegram_id',
        validate: {
          isNumeric: true
        }
      },
      password: {
        type: DataTypes.VIRTUAL,
        set(value) {
          this.setDataValue('password', value);
          this.setDataValue('password_hash', value);
        }
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('admin', 'teacher', 'student'),
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      classId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Classes',
          key: 'id'
        },
        allowNull: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      }
    }, {
      sequelize,
      tableName: 'users',
      timestamps: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password_hash = await User.hashPassword(user.password);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password_hash = await User.hashPassword(user.password);
          }
        }
      }
    });
  }

  // Define associations
  static associate(models) {
    this.belongsTo(models.Class, { foreignKey: 'classId' });
    this.hasMany(models.Exam, { as: 'createdExams', foreignKey: 'createdBy' });
    this.hasMany(models.Answer, { foreignKey: 'userId' });
    this.hasMany(models.Session, { foreignKey: 'userId' });
    this.belongsToMany(models.Subject, { 
      through: 'TeacherSubjects',
      foreignKey: 'userId',
      as: 'subjects'
    });
  }
}

// Export the model initialization function
const defineUser = (sequelize) => {
  User.initialize(sequelize);
  
  // Set up associations after all models are defined
  User.associate = (models) => {
    User.belongsTo(models.Class, { foreignKey: 'classId' });
    User.hasMany(models.Exam, { as: 'createdExams', foreignKey: 'createdBy' });
    User.hasMany(models.Answer, { foreignKey: 'userId' });
    User.hasMany(models.Session, { foreignKey: 'userId' });
    User.belongsToMany(models.Subject, { 
      through: 'TeacherSubjects',
      foreignKey: 'userId',
      as: 'subjects'
    });
  };
  
  return User;
};

// For backward Compatibility
const initUser = defineUser;

module.exports = defineUser;
