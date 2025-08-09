module.exports = (sequelize, DataTypes) => {
  const TeacherClassSubject = sequelize.define('TeacherClassSubject', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Classes',
        key: 'id'
      }
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Subjects',
        key: 'id'
      }
    }
  }, {
    tableName: 'TeacherClassSubjects',
    timestamps: true
  });

  // Define associations
  TeacherClassSubject.associate = function(models) {
    // A TeacherClassSubject belongs to a User (teacher)
    TeacherClassSubject.belongsTo(models.User, {
      foreignKey: 'teacherId',
      as: 'teacher',
      onDelete: 'CASCADE'
    });
    
    // A TeacherClassSubject belongs to a Class
    TeacherClassSubject.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class',
      onDelete: 'CASCADE'
    });
    
    // A TeacherClassSubject belongs to a Subject
    TeacherClassSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject',
      onDelete: 'CASCADE'
    });
  };
  
  return TeacherClassSubject;
};
