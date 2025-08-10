const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, drop any existing foreign key constraints
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          -- Drop foreign key constraints
          FOR r IN (
              SELECT conname, conrelid::regclass AS table_name
              FROM pg_constraint
              WHERE conname LIKE '%answer_%_fkey' AND conrelid = 'public."Answers"'::regclass
          ) LOOP
              EXECUTE 'ALTER TABLE public."Answers" DROP CONSTRAINT IF EXISTS ' || r.conname || ';';
          END LOOP;
      END $$;
    `);

    // Rename columns if they exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          -- Rename columns if they exist
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Answers' AND column_name = 'QuestionId') THEN
              ALTER TABLE "Answers" RENAME COLUMN "QuestionId" TO "questionId";
          END IF;
          
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Answers' AND column_name = 'ExamId') THEN
              ALTER TABLE "Answers" RENAME COLUMN "ExamId" TO "examId";
          END IF;
          
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Answers' AND column_name = 'UserId') THEN
              ALTER TABLE "Answers" RENAME COLUMN "UserId" TO "userId";
          END IF;
      END $$;
    `);

    // Recreate foreign key constraints with correct column names
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          -- Add foreign key for questionId
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'Answers_questionId_Questions_fkey'
          ) AND EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Answers' AND column_name = 'questionId'
          ) THEN
              ALTER TABLE "Answers" 
              ADD CONSTRAINT "Answers_questionId_Questions_fkey" 
              FOREIGN KEY ("questionId") REFERENCES "Questions" ("id") 
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;

          -- Add foreign key for examId
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'Answers_examId_Exams_fkey'
          ) AND EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Answers' AND column_name = 'examId'
          ) THEN
              ALTER TABLE "Answers" 
              ADD CONSTRAINT "Answers_examId_Exams_fkey" 
              FOREIGN KEY ("examId") REFERENCES "Exams" ("id") 
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;

          -- Add foreign key for userId
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'Answers_userId_Users_fkey'
          ) AND EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Answers' AND column_name = 'userId'
          ) THEN
              ALTER TABLE "Answers" 
              ADD CONSTRAINT "Answers_userId_Users_fkey" 
              FOREIGN KEY ("userId") REFERENCES "Users" ("id") 
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // This migration is not easily reversible due to potential data loss
    // and foreign key constraints. In production, you might want to 
    // create a backup before running this migration.
    console.warn('Migration 20240810_fix_answer_columns cannot be automatically rolled back');
  }
};
