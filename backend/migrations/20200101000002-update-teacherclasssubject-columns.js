'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, drop the existing foreign key constraints
    await queryInterface.sequelize.query(
      `ALTER TABLE "TeacherClassSubjects" 
       DROP CONSTRAINT IF EXISTS "TeacherClassSubjects_teacherId_fkey",
       DROP CONSTRAINT IF EXISTS "TeacherClassSubjects_teacherId_Users_fk";`
    );

    // Change the column type to UUID
    await queryInterface.changeColumn('TeacherClassSubjects', 'teacherId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert the column type back to INTEGER
    await queryInterface.changeColumn('TeacherClassSubjects', 'teacherId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};
