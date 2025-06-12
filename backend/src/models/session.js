const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Session = sequelize.define('Session', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    startTime: { type: DataTypes.DATE },
    endTime: { type: DataTypes.DATE },
    status: { type: DataTypes.STRING },
  });
  return Session;
}; 