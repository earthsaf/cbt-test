const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Answer = sequelize.define('Answer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    answer: { type: DataTypes.STRING },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    flagged: { type: DataTypes.BOOLEAN, defaultValue: false },
  });
  return Answer;
}; 