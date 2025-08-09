'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First check if the column already exists to avoid errors
    const [results] = await queryInterface.sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='Exams' AND column_name='classId'`
    );

    if (results.length === 0) {
      // Column doesn't exist, add it
      await queryInterface.addColumn('Exams', 'classId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      
      console.log('Added classId column to Exams table');
    } else {
      console.log('classId column already exists in Exams table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Exams', 'classId');
  }
};
