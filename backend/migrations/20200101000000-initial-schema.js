'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Use a transaction to ensure atomic migration
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1) Classes (no FKs required before this)
      await queryInterface.createTable('Classes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          unique: true,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 2) Subjects
      await queryInterface.createTable('Subjects', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          unique: true,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 3) Users
      await queryInterface.createTable('Users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        telegram_id: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        password_hash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM('admin', 'teacher', 'student'),
          allowNull: false
        },
        active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        classId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Classes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 4) Exams
      await queryInterface.createTable('Exams', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        startTime: {
          type: Sequelize.DATE,
          allowNull: true
        },
        durationMinutes: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING,
          allowNull: true
        },
        invigilatorCode: {
          type: Sequelize.STRING,
          allowNull: true
        },
        scramble: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        subjectId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Subjects',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        classId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Classes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 5) Questions
      await queryInterface.createTable('Questions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false
        },
        text: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        options: {
          // Postgres JSONB (if using Postgres)
          type: Sequelize.JSONB,
          allowNull: true
        },
        answer: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING,
          defaultValue: 'active'
        },
        version: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        examId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Exams',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 6) Answers
      await queryInterface.createTable('Answers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        answer: {
          type: Sequelize.STRING,
          allowNull: false
        },
        timestamp: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        flagged: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        exam_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Exams',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        question_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Questions',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 7) TeacherClassSubjects
      await queryInterface.createTable('TeacherClassSubjects', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        teacherId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        classId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Classes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        subjectId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Subjects',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    // Drop in reverse order inside a transaction
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('TeacherClassSubjects', { transaction });
      await queryInterface.dropTable('Answers', { transaction });
      await queryInterface.dropTable('Questions', { transaction });
      await queryInterface.dropTable('Exams', { transaction });
      await queryInterface.dropTable('Users', { transaction });
      await queryInterface.dropTable('Subjects', { transaction });
      await queryInterface.dropTable('Classes', { transaction });

      // Drop ENUM type created for Users.role (Postgres)
      // Sequelize sometimes creates enum types named like "enum_Users_role"
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
