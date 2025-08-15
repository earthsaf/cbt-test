'use strict';

/**
 * Comprehensive initial migration that creates all tables, relationships,
 * indexes and ENUM types matching the current model definitions you provided.
 *
 * Filename suggestion: 20250815000000-initial-full-schema.js
 *
 * NOTE: This migration assumes Postgres (uses JSONB and ENUMs).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      //
      // 1) Classes
      //
      await queryInterface.createTable('Classes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false, unique: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      //
      // 2) Subjects
      //
      await queryInterface.createTable('Subjects', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false, unique: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      //
      // 3) users (lowercase) - matches User.js tableName: 'users'
      //    role ENUM => ('admin','teacher','student')
      //
      await queryInterface.createTable('users', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        email: { type: Sequelize.STRING, allowNull: false, unique: true },
        telegram_id: { type: Sequelize.STRING, allowNull: true, unique: true },
        password_hash: { type: Sequelize.STRING, allowNull: false },
        name: { type: Sequelize.STRING, allowNull: false },
        role: { type: Sequelize.ENUM('admin', 'teacher', 'student'), allowNull: false },
        active: { type: Sequelize.BOOLEAN, defaultValue: true },
        classId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Classes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      // helpful indexes
      await queryInterface.addIndex('users', ['email'], { unique: true, transaction });
      await queryInterface.addIndex('users', ['telegram_id'], { unique: true, transaction });
      await queryInterface.addIndex('users', ['role'], { transaction });

      //
      // 4) TeacherSubjects (join table referenced in User model belongsToMany -> through: 'TeacherSubjects')
      //    Keeps a simple mapping userId <-> subjectId to satisfy the association
      //
      await queryInterface.createTable('TeacherSubjects', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        subjectId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Subjects', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addConstraint('TeacherSubjects', {
        fields: ['userId', 'subjectId'],
        type: 'unique',
        name: 'uniq_teachersubject_user_subject',
        transaction
      });
      await queryInterface.addIndex('TeacherSubjects', ['userId'], { transaction });
      await queryInterface.addIndex('TeacherSubjects', ['subjectId'], { transaction });

      //
      // 5) Students
      //    Student.userId references users.id (UUID) per Student.js
      //
      await queryInterface.createTable('Students', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        classId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Classes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        rollNumber: { type: Sequelize.STRING, allowNull: false, unique: true },
        status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Students', ['userId'], { transaction });
      await queryInterface.addIndex('Students', ['classId'], { transaction });

      //
      // 6) Exams
      //    include createdBy (UUID) as in migration you previously had
      //
      await queryInterface.createTable('Exams', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: Sequelize.STRING, allowNull: false },
        startTime: { type: Sequelize.DATE, allowNull: true },
        durationMinutes: { type: Sequelize.INTEGER, allowNull: true },
        status: { type: Sequelize.STRING, allowNull: true },
        invigilatorCode: { type: Sequelize.STRING, allowNull: true },
        scramble: { type: Sequelize.BOOLEAN, defaultValue: false },
        subjectId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Subjects', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        classId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Classes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Exams', ['classId'], { transaction });
      await queryInterface.addIndex('Exams', ['subjectId'], { transaction });
      await queryInterface.addIndex('Exams', ['createdBy'], { transaction });

      //
      // 7) Questions
      //
      await queryInterface.createTable('Questions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        type: { type: Sequelize.STRING, allowNull: false },
        text: { type: Sequelize.TEXT, allowNull: false },
        options: { type: Sequelize.JSONB, allowNull: true }, // Postgres JSONB
        answer: { type: Sequelize.STRING, allowNull: true },
        status: { type: Sequelize.STRING, defaultValue: 'active' },
        version: { type: Sequelize.INTEGER, defaultValue: 1 },
        examId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Exams', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Questions', ['examId'], { transaction });
      await queryInterface.addIndex('Questions', ['status'], { transaction });

      //
      // 8) TeacherClassSubjects
      //    keep both teacher_id (legacy) and teacher_id_new (UUID) plus version column for optimistic locking
      //
      await queryInterface.createTable('TeacherClassSubjects', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

        teacher_id: { // legacy column - nullable to allow transition
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },

        teacher_id_new: { // new UUID column used by models during migration
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },

        class_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Classes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },

        subject_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Subjects', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },

        version: { type: Sequelize.INTEGER, allowNull: true }, // Sequelize optimistic lock if model.version=true

        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('TeacherClassSubjects', ['teacher_id_new'], { transaction });
      await queryInterface.addIndex('TeacherClassSubjects', ['teacher_id'], { transaction });
      await queryInterface.addIndex('TeacherClassSubjects', ['class_id'], { transaction });
      await queryInterface.addIndex('TeacherClassSubjects', ['subject_id'], { transaction });

      // Prevent accidental duplicate assignment rows for same teacher+class+subject using the new teacher id
      await queryInterface.addConstraint('TeacherClassSubjects', {
        fields: ['teacher_id_new', 'class_id', 'subject_id'],
        type: 'unique',
        name: 'uniq_teacherclasssubject_new_tuple',
        transaction
      }).catch(() => {}); // ignore conflict if it exists

      //
      // 9) Answers (use snake_case field names to match model Field mapping)
      //
      await queryInterface.createTable('Answers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        answer: { type: Sequelize.STRING, allowNull: false },
        timestamp: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        flagged: { type: Sequelize.BOOLEAN, defaultValue: false },
        exam_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Exams', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        question_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Questions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Answers', ['exam_id'], { transaction });
      await queryInterface.addIndex('Answers', ['question_id'], { transaction });
      await queryInterface.addIndex('Answers', ['user_id'], { transaction });

      //
      // 10) Alerts  (model Alert.js references Students and Exams)
      //
      await queryInterface.createTable('Alerts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        studentId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Students', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        examId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Exams', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        reason: { type: Sequelize.STRING, allowNull: false },
        screenshot: { type: Sequelize.STRING, allowNull: true },
        timestamp: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        status: { type: Sequelize.ENUM('new', 'resolved'), defaultValue: 'new' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Alerts', ['studentId'], { transaction });
      await queryInterface.addIndex('Alerts', ['examId'], { transaction });
      await queryInterface.addIndex('Alerts', ['status'], { transaction });

      //
      // 11) Sessions
      //
      await queryInterface.createTable('Sessions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        startTime: { type: Sequelize.DATE },
        endTime: { type: Sequelize.DATE },
        status: { type: Sequelize.STRING },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Sessions', ['userId'], { transaction });
      await queryInterface.addIndex('Sessions', ['status'], { transaction });

      //
      // 12) Logs
      //
      await queryInterface.createTable('Logs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        action: { type: Sequelize.STRING },
        timestamp: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        details: { type: Sequelize.TEXT },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Logs', ['action'], { transaction });
      await queryInterface.addIndex('Logs', ['timestamp'], { transaction });

      //
      // 13) Notifications
      //     model had recipient_id as INTEGER (no FK declared), keep it as integer (flexible - could represent class id or student id)
      //
      await queryInterface.createTable('Notifications', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        recipient_id: { type: Sequelize.INTEGER, allowNull: false },
        sender: { type: Sequelize.STRING, allowNull: false },
        scope: { type: Sequelize.ENUM('General', 'Class-specific'), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: false },
        is_read: { type: Sequelize.BOOLEAN, defaultValue: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('Notifications', ['recipient_id'], { transaction });
      await queryInterface.addIndex('Notifications', ['is_read'], { transaction });

      //
      // 14) ProctoringEvents
      //
      await queryInterface.createTable('ProctoringEvents', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        eventType: { type: Sequelize.STRING },
        timestamp: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        data: { type: Sequelize.TEXT },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { transaction });

      await queryInterface.addIndex('ProctoringEvents', ['eventType'], { transaction });
      await queryInterface.addIndex('ProctoringEvents', ['timestamp'], { transaction });

      // Commit transaction
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop in reverse order
      await queryInterface.dropTable('ProctoringEvents', { transaction });
      await queryInterface.dropTable('Notifications', { transaction });
      await queryInterface.dropTable('Logs', { transaction });
      await queryInterface.dropTable('Sessions', { transaction });
      await queryInterface.dropTable('Alerts', { transaction });
      await queryInterface.dropTable('Answers', { transaction });
      await queryInterface.dropTable('TeacherClassSubjects', { transaction });
      await queryInterface.dropTable('Questions', { transaction });
      await queryInterface.dropTable('Exams', { transaction });
      await queryInterface.dropTable('Students', { transaction });
      await queryInterface.dropTable('TeacherSubjects', { transaction });
      await queryInterface.dropTable('users', { transaction });
      await queryInterface.dropTable('Subjects', { transaction });
      await queryInterface.dropTable('Classes', { transaction });

      // Drop ENUM types (Postgres). Use IF EXISTS to be safe.
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";', { transaction }).catch(()=>{});
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_students_status";', { transaction }).catch(()=>{});
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_alerts_status";', { transaction }).catch(()=>{});
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_scope";', { transaction }).catch(()=>{});

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
