const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

const User = require('./user')(sequelize);
const Class = require('./class')(sequelize);
const Exam = require('./exam')(sequelize);
const Question = require('./question')(sequelize);
const Answer = require('./answer')(sequelize);
const Session = require('./session')(sequelize);
const Log = require('./log')(sequelize);
const ProctoringEvent = require('./proctoringEvent')(sequelize);
const Subject = require('./class')(sequelize).Subject || require('./subject')(sequelize);
const TeacherClassSubject = sequelize.define('TeacherClassSubject', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
});
TeacherClassSubject.belongsTo(User, { as: 'teacher', foreignKey: 'teacherId' });
TeacherClassSubject.belongsTo(Class, { foreignKey: 'classId' });
TeacherClassSubject.belongsTo(Subject, { foreignKey: 'subjectId' });
User.belongsToMany(Class, { through: TeacherClassSubject, as: 'TeachingClasses', foreignKey: 'teacherId' });
User.belongsToMany(Subject, { through: TeacherClassSubject, as: 'TeachingSubjects', foreignKey: 'teacherId' });
Class.belongsToMany(Subject, { through: TeacherClassSubject, as: 'ClassSubjects', foreignKey: 'classId' });

// Associations
User.belongsTo(Class);
Class.hasMany(User);
Exam.belongsTo(Class);
Class.hasMany(Exam);
Exam.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
Question.belongsTo(Exam);
Exam.hasMany(Question);
Answer.belongsTo(User);
Answer.belongsTo(Exam);
Answer.belongsTo(Question);
Session.belongsTo(User);
Session.belongsTo(Exam);
ProctoringEvent.belongsTo(Session);
Log.belongsTo(User);

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