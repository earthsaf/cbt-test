'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Exams', 'subjectId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Subjects', // name of the table, not the model
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Exams', 'subjectId');
  }
};