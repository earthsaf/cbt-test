const { DataTypes } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('student', 'teacher', 'admin', 'invigilator'),
      allowNull: false
    },
    telegramId: {
      type: DataTypes.STRING
    },
    name: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'Users',
    timestamps: true
  });
  return User;
};