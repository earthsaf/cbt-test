const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Import models
const User = require('./user');
const Class = require('./class');
const Exam = require('./exam');
const Question = require('./question');
const Answer = require('./answer');
const Session = require('./session');
const Log = require('./log');
const ProctoringEvent = require('./proctoringEvent');
const Subject = require('./subject');
const TeacherClassSubject = require('./TeacherClassSubject');
const Notification = require('./notification');

// Initialize models
const UserModel = User(sequelize, DataTypes);
const ClassModel = Class(sequelize, DataTypes);
const ExamModel = Exam(sequelize, DataTypes);
const QuestionModel = Question(sequelize, DataTypes);
const AnswerModel = Answer(sequelize, DataTypes);
const SessionModel = Session(sequelize, DataTypes);
const LogModel = Log(sequelize, DataTypes);
const ProctoringEventModel = ProctoringEvent(sequelize, DataTypes);
const SubjectModel = Subject(sequelize, DataTypes);
const TeacherClassSubjectModel = TeacherClassSubject(sequelize, DataTypes);
const NotificationModel = Notification(sequelize, DataTypes);

// Associations
UserModel.belongsTo(ClassModel);
ClassModel.hasMany(UserModel);
ExamModel.belongsTo(ClassModel);
ClassModel.hasMany(ExamModel);
ExamModel.belongsTo(UserModel, { as: 'creator', foreignKey: 'createdBy' });
ExamModel.belongsTo(SubjectModel, { foreignKey: 'subjectId' });
SubjectModel.hasMany(ExamModel, { foreignKey: 'subjectId' });
QuestionModel.belongsTo(ExamModel);
ExamModel.hasMany(QuestionModel);
AnswerModel.belongsTo(UserModel);
AnswerModel.belongsTo(ExamModel);
AnswerModel.belongsTo(QuestionModel);
SessionModel.belongsTo(UserModel);
SessionModel.belongsTo(ExamModel);
ProctoringEventModel.belongsTo(SessionModel);
LogModel.belongsTo(UserModel);
UserModel.belongsToMany(ClassModel, { through: TeacherClassSubjectModel, as: 'TeachingClasses', foreignKey: 'teacherId' });
UserModel.belongsToMany(SubjectModel, { through: TeacherClassSubjectModel, as: 'TeachingSubjects', foreignKey: 'teacherId' });
ClassModel.belongsToMany(SubjectModel, { through: TeacherClassSubjectModel, as: 'ClassSubjects', foreignKey: 'classId' });
TeacherClassSubjectModel.belongsTo(UserModel, { as: 'teacher', foreignKey: 'teacherId' });
TeacherClassSubjectModel.belongsTo(ClassModel, { foreignKey: 'classId' });
TeacherClassSubjectModel.belongsTo(SubjectModel, { foreignKey: 'subjectId' });

// Notification associations
NotificationModel.belongsTo(UserModel, { as: 'recipient', foreignKey: 'recipient_id' });
UserModel.hasMany(NotificationModel, { foreignKey: 'recipient_id' });

// Export models
module.exports = {
  sequelize,
  User: UserModel,
  Class: ClassModel,
  Exam: ExamModel,
  Question: QuestionModel,
  Answer: AnswerModel,
  Session: SessionModel,
  Log: LogModel,
  ProctoringEvent: ProctoringEventModel,
  Subject: SubjectModel,
  TeacherClassSubject: TeacherClassSubjectModel,
  Notification: NotificationModel,
}; 