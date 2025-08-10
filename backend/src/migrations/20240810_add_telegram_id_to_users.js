module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          -- Add telegram_id column if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Users' AND column_name = 'telegram_id'
          ) THEN
              ALTER TABLE "Users" 
              ADD COLUMN "telegram_id" VARCHAR(255) UNIQUE
              CHECK ("telegram_id" ~ '^\\d+$'); -- Only allow numeric values
              
              -- Add comment to the column
              COMMENT ON COLUMN "Users"."telegram_id" IS 'Telegram user ID for bot integration';
          END IF;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'telegram_id');
  }
};
