const path = require('path');
const fs = require('fs');

// Load environment variables from parent directory
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}. Using environment variables from system.`);
}

const { Sequelize } = require('sequelize');

// Log environment variables for debugging (but not the actual database URL for security)
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

// Create a new Sequelize instance with the same configuration as the main app
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.error('Please ensure your .env file contains a valid DATABASE_URL');
  process.exit(1);
}

// Parse the database URL for better error messages
let dbUrl;
try {
  dbUrl = new URL(process.env.DATABASE_URL);
  console.log(`Connecting to database: ${dbUrl.protocol}//${dbUrl.host}${dbUrl.pathname}`);
} catch (error) {
  console.error('❌ Error: Invalid DATABASE_URL format');
  console.error('Please check your DATABASE_URL in the .env file');
  process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    // Additional options for better connection handling
    keepAlive: true,
    connectionTimeoutMillis: 10000,
    idle_in_transaction_session_timeout: 10000
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
});

async function runMigrations() {
  try {
    // Read all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && file !== '20250618220643-add-scramble-to-exam.js')
      .sort();

    console.log(`Found ${migrationFiles.length} migration(s) to run`);

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Run each migration
      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const migration = require(path.join(migrationsDir, file));
        await migration.up(sequelize.getQueryInterface(), Sequelize);
        console.log(`✅ Migration ${file} completed successfully`);
      }

      // Commit the transaction if all migrations succeed
      await transaction.commit();
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      // Rollback the transaction if any migration fails
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
