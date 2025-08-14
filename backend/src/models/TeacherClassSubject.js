module.exports = (sequelize, DataTypes) => {
  const TeacherClassSubject = sequelize.define('TeacherClassSubject', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Will be made required after migration
      field: 'teacher_id', // Explicitly map to snake_case column
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    teacherIdNew: {
      type: DataTypes.UUID,
      allowNull: true, // Will be made required after migration
      field: 'teacher_id_new', // Explicitly map to snake_case column
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'class_id',
      references: {
        model: 'Classes',
        key: 'id'
      }
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subject_id',
      references: {
        model: 'Subjects',
        key: 'id'
      }
    },
    // Virtual field for backward compatibility during transition
    teacherUuid: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.teacherIdNew || this.teacherId;
      },
      set(value) {
        this.setDataValue('teacherIdNew', value);
      }
    }
  }, {
    tableName: 'TeacherClassSubjects',
    timestamps: true,
    // Enable optimistic locking to prevent concurrent updates during migration
    version: true
  });

  // Define associations
  TeacherClassSubject.associate = function(models) {
    // Association with User (teacher) - using the new UUID field
    TeacherClassSubject.belongsTo(models.User, {
      foreignKey: 'teacherIdNew',
      as: 'teacher',
      onDelete: 'CASCADE',
      constraints: false // Temporary until migration is complete
    });
    
    // Legacy association (will be removed after migration)
    TeacherClassSubject.belongsTo(models.User, {
      foreignKey: 'teacherId',
      as: 'legacyTeacher',
      onDelete: 'CASCADE',
      constraints: false // Temporary until migration is complete
    });
    
    // Class association
    TeacherClassSubject.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class',
      onDelete: 'CASCADE'
    });
    
    // Subject association
    TeacherClassSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject',
      onDelete: 'CASCADE'
    });
  };

  // Add a method to safely get the teacher ID regardless of migration state
  TeacherClassSubject.prototype.getTeacherId = function() {
    return this.teacherIdNew || this.teacherId;
  };
  
  return TeacherClassSubject;
};
