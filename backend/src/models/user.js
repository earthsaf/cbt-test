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

  // Static method for validation rules
  static getValidationRules(method) {
    switch (method) {
      case 'login': {
        return [
          body('email')
            .isEmail().withMessage('Please provide a valid email')
            .normalizeEmail(),
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
        type: DataTypes.UUID,
        references: {
          model: 'Classes',
          key: 'id'
        },
        allowNull: true
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

// For backward compatibility
const initUser = defineUser;

module.exports = defineUser;