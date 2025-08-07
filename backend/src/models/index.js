const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Import models
const defineUser = require('./user');
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

// Initialize models with Sequelize instance
const db = {
  User: defineUser(sequelize),
  Class: defineClass(sequelize),
  Exam: defineExam(sequelize),
  Question: defineQuestion(sequelize),
  Answer: defineAnswer(sequelize),
  Session: defineSession(sequelize),
  Log: defineLog(sequelize),
  ProctoringEvent: defineProctoringEvent(sequelize),
  Subject: defineSubject(sequelize),
  TeacherClassSubject: defineTeacherClassSubject(sequelize),
  Notification: defineNotification(sequelize)
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