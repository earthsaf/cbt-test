const { DataTypes } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const ProctoringEvent = sequelize.define('ProctoringEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventType: {
      type: DataTypes.STRING
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    data: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'ProctoringEvents',
    timestamps: true
  });
  return ProctoringEvent;
};