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
      field: 'exam_id',
      references: {
        model: 'Exams',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'question_id',
      references: {
        model: 'Questions',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
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
      foreignKey: 'questionId',
      as: 'question',
      targetKey: 'id'
    });
    
    // An Answer belongs to a User
    Answer.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      targetKey: 'id'
    });
  };

  return Answer;
};