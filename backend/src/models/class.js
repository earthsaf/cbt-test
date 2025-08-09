module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define('Class', {
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
    tableName: 'Classes',
    timestamps: true
  });

  Class.associate = function(models) {
    // A Class can have many Exams
    Class.hasMany(models.Exam, {
      foreignKey: 'classId',
      as: 'exams'
    });
    
    // A Class can have many Students (Users with role 'student')
    Class.hasMany(models.User, {
      foreignKey: 'classId',
      as: 'students',
      scope: {
        role: 'student'
      }
    });
    
    // A Class can have many TeacherClassSubject assignments
    Class.hasMany(models.TeacherClassSubject, {
      foreignKey: 'classId',
      as: 'teacherAssignments'
    });
  };

  return Class;
};