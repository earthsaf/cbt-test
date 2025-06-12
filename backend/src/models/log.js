const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Log = sequelize.define('Log', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    action: { type: DataTypes.STRING },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    details: { type: DataTypes.TEXT },
  });
  return Log;
}; 