const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

// Create a table to track migrations if it doesn't exist
const createMigrationsTable = async (sequelize) => {
  const query = `
    CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
      "name" VARCHAR(255) NOT NULL,
      PRIMARY KEY ("name"),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;
  
  await sequelize.query(query);
};

// Get list of applied migrations
const getAppliedMigrations = async (sequelize) => {
  await createMigrationsTable(sequelize);
  const [results] = await sequelize.query('SELECT "name" FROM "SequelizeMeta"');
  return results.map(row => row.name);
};

// Mark a migration as applied
const markMigrationApplied = async (sequelize, migrationName) => {
  await sequelize.query(
    'INSERT INTO "SequelizeMeta" ("name") VALUES ($1)',
    { bind: [migrationName] }
  );
};

// Run pending migrations
const runMigrations = async (sequelize, migrationsPath) => {
  try {
    const appliedMigrations = new Set(await getAppliedMigrations(sequelize));
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js') && file !== '20250618220643-add-scramble-to-exam.js')
      .sort();
    
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      if (!appliedMigrations.has(file)) {
        console.log(`Running migration: ${file}`);
        const migration = require(path.join(migrationsPath, file));
        
        // Start a transaction for each migration
        const transaction = await sequelize.transaction();
        
        try {
          await migration.up(sequelize.getQueryInterface(), Sequelize, { transaction });
          await markMigrationApplied(sequelize, file);
          await transaction.commit();
          migrationsRun++;
          console.log(`✅ Migration ${file} completed successfully`);
        } catch (error) {
          await transaction.rollback();
          console.error(`❌ Migration ${file} failed:`, error);
          throw error;
        }
      }
    }
    
    if (migrationsRun > 0) {
      console.log(`✅ Successfully ran ${migrationsRun} migration(s)`);
    } else {
      console.log('✅ Database is up to date, no new migrations to run');
    }
    
    return migrationsRun;
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
};

module.exports = { runMigrations };
