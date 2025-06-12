const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Question = sequelize.define('Question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    options: { type: DataTypes.JSON },
    answer: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
  });
  return Question;
}; 