module.exports = (sequelize, DataTypes) => {
  const Answer = sequelize.define('Answer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    answer: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Foreign keys
    examId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'examId',
      references: {
        model: 'Exams',
        key: 'id'
      }
    },
    QuestionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Questions',
        key: 'id'
      }
    },
    UserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'Answers',
    timestamps: true
  });

  // Define associations
  Answer.associate = function(models) {
    // An Answer belongs to an Exam
    Answer.belongsTo(models.Exam, {
      foreignKey: 'examId',
      as: 'exam',
      targetKey: 'id'
    });
    
    // An Answer belongs to a Question
    Answer.belongsTo(models.Question, {
      foreignKey: 'QuestionId',
      as: 'Question'
    });
    
    // An Answer belongs to a User
    Answer.belongsTo(models.User, {
      foreignKey: 'UserId',
      as: 'User'
    });
  };

  return Answer;
};