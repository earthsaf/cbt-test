const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Class = sequelize.define('Class', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
  });
  return Class;
}; 