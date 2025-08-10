module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true
    },
    answer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    // Foreign key for Exam
    examId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Exams',
        key: 'id'
      }
    }
  }, {
    tableName: 'Questions',
    timestamps: true
  });

  // Define associations
  Question.associate = function(models) {
    // A Question belongs to an Exam
    Question.belongsTo(models.Exam, {
      foreignKey: 'examId',
      as: 'exam'
    });
    
    // A Question has many Answers
    Question.hasMany(models.Answer, {
      foreignKey: 'questionId',
      as: 'answers',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return Question;
};