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
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash'
    },
    role: {
      type: DataTypes.ENUM('student', 'teacher', 'admin', 'invigilator'),
      allowNull: false
    },
    telegram_id: {
      type: DataTypes.STRING,
      field: 'telegram_id'
    },
    name: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    class_id: {
      type: DataTypes.INTEGER,
      field: 'class_id'
    }
  }, {
    tableName: 'Users',
    timestamps: true,
    underscored: true
  });
  return User;
};