module.exports = (sequelize, DataTypes) => {
  const Exam = sequelize.define('Exam', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startTime: {
      type: DataTypes.DATE
    },
    durationMinutes: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.STRING
    },
    invigilatorCode: {
      type: DataTypes.STRING
    },
    scramble: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    subjectId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Subjects',
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
    }
  }, {
    tableName: 'Exams',
    timestamps: true
  });

  Exam.associate = function(models) {
    // An Exam belongs to a Class
    Exam.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    // An Exam belongs to a Subject
    Exam.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject'
    });
  };

  return Exam;
};