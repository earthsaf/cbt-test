const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Import models
const defineUser = require('./User');
const defineClass = require('./class');
const defineExam = require('./exam');
const defineQuestion = require('./question');
const defineAnswer = require('./answer');
const defineSession = require('./session');
const defineLog = require('./log');
const defineProctoringEvent = require('./proctoringEvent');
const defineSubject = require('./subject');
const defineTeacherClassSubject = require('./TeacherClassSubject');
const defineNotification = require('./notification');

// Initialize models with Sequelize instance and DataTypes
const db = {
  User: defineUser(sequelize, DataTypes),
  Class: defineClass(sequelize, DataTypes),
  Exam: defineExam(sequelize, DataTypes),
  Question: defineQuestion(sequelize, DataTypes),
  Answer: defineAnswer(sequelize, DataTypes),
  Session: defineSession(sequelize, DataTypes),
  Log: defineLog(sequelize, DataTypes),
  ProctoringEvent: defineProctoringEvent(sequelize, DataTypes),
  Subject: defineSubject(sequelize, DataTypes),
  TeacherClassSubject: defineTeacherClassSubject(sequelize, DataTypes),
  Notification: defineNotification(sequelize, DataTypes)
};

// Set up associations
Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});

// Add sequelize instance to db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 