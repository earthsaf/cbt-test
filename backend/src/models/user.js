const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');

// Password validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

class User extends Model {
  static init(sequelize) {
    return super.init({
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
        model: 'Classes', // This should match the table name exactly as it appears in the database
        key: 'id'
      },
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users', // Explicitly set the table name
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password_hash = await model.hashPassword(user.password);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password_hash = await model.hashPassword(user.password);
        }
      }
    },
    instanceMethods: {
      verifyPassword: async function(plainPassword) {
        return await bcrypt.compare(plainPassword, this.password_hash);
      },
      isPasswordValid: function(password) {
        if (typeof password !== 'string') return false;
        if (password.length < PASSWORD_MIN_LENGTH) return false;
        if (!PASSWORD_REGEX.test(password)) return false;
        return true;
      }
    },
    classMethods: {
      hashPassword: async function(password) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
      },
      getPasswordRequirements: function() {
        return {
          minLength: PASSWORD_MIN_LENGTH,
          requiresUppercase: true,
          requiresLowercase: true,
          requiresNumber: true,
          requiresSpecialChar: true,
          description: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and include uppercase, lowercase, number, and special character`
        };
      },
      findByEmail: async function(email) {
        return await this.findOne({ where: { email } });
      }
    }
  });

  // Add associations
  model.associate = (models) => {
    model.belongsTo(models.Class);
    model.hasMany(models.Exam, { as: 'createdExams', foreignKey: 'createdBy' });
    model.hasMany(models.Answer);
    model.hasMany(models.Session);
    model.belongsToMany(models.Subject, { through: 'TeacherSubjects' });
  };

  // Add the validate method as a static method
  model.validate = (method) => {
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
    }
  };

  return model;
};

module.exports = User;