const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Import models
const User = require('./user')(sequelize, DataTypes);
const Class = require('./class')(sequelize, DataTypes);
const Exam = require('./exam')(sequelize, DataTypes);
const Question = require('./question')(sequelize, DataTypes);
const Answer = require('./answer')(sequelize, DataTypes);
const Session = require('./session')(sequelize, DataTypes);
const Log = require('./log')(sequelize, DataTypes);
const ProctoringEvent = require('./proctoringEvent')(sequelize, DataTypes);
const Subject = require('./subject')(sequelize, DataTypes);
const TeacherClassSubject = require('./TeacherClassSubject')(sequelize, DataTypes);

// Associations
User.belongsTo(Class);
Class.hasMany(User);
Exam.belongsTo(Class);
Class.hasMany(Exam);
Exam.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
Exam.belongsTo(Subject, { foreignKey: 'subjectId' });
Subject.hasMany(Exam, { foreignKey: 'subjectId' });
Question.belongsTo(Exam);
Exam.hasMany(Question);
Answer.belongsTo(User);
Answer.belongsTo(Exam);
Answer.belongsTo(Question);
Session.belongsTo(User);
Session.belongsTo(Exam);
ProctoringEvent.belongsTo(Session);
Log.belongsTo(User);
User.belongsToMany(Class, { through: TeacherClassSubject, as: 'TeachingClasses', foreignKey: 'teacherId' });
User.belongsToMany(Subject, { through: TeacherClassSubject, as: 'TeachingSubjects', foreignKey: 'teacherId' });
Class.belongsToMany(Subject, { through: TeacherClassSubject, as: 'ClassSubjects', foreignKey: 'classId' });
TeacherClassSubject.belongsTo(User, { as: 'teacher', foreignKey: 'teacherId' });
TeacherClassSubject.belongsTo(Class, { foreignKey: 'classId' });
TeacherClassSubject.belongsTo(Subject, { foreignKey: 'subjectId' });

// Export models
module.exports = {
  sequelize,
  User,
  Class,
  Exam,
  Question,
  Answer,
  Session,
  Log,
  ProctoringEvent,
  Subject,
  TeacherClassSubject,
}; 