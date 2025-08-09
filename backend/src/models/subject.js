const { DataTypes } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define('Subject', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    }
  }, {
    tableName: 'Subjects',
    timestamps: true
  });

  Subject.associate = function(models) {
    // A Subject can have many TeacherClassSubject assignments
    Subject.hasMany(models.TeacherClassSubject, {
      foreignKey: 'subjectId',
      as: 'teacherAssignments'
    });
  };
  
  return Subject;
};