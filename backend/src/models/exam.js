const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Exam = sequelize.define('Exam', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    startTime: { type: DataTypes.DATE },
    durationMinutes: { type: DataTypes.INTEGER },
    status: { type: DataTypes.STRING },
    invigilatorCode: { type: DataTypes.STRING },
  });
  return Exam;
}; 