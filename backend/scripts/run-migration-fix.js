const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

// Use the external database URL
const DATABASE_URL = 'postgresql://cbt_db_p54i_user:ndCLl3YHvMxyCD6lEfEuhUWK5BwwmwhZ@dpg-d289auggjchc73935v6g-a.oregon-postgres.render.com/cbt_db_p54i';

console.log('Using database:', DATABASE_URL.split('@')[1]);

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
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
    
    // Only run the Answers table migration
    const targetMigration = '20250811120410-create-answers-table.js';
    
    console.log(`Looking for migration: ${targetMigration}`);
    
    if (!fs.existsSync(path.join(migrationsDir, targetMigration))) {
      console.error(`❌ Error: Migration file ${targetMigration} not found`);
      process.exit(1);
    }

    // Check if Answers table already exists
    const tableExists = await sequelize.getQueryInterface().showAllTables()
      .then(tables => tables.includes('Answers'));
      
    if (tableExists) {
      console.log('✅ Answers table already exists. No migration needed.');
      return;
    }

    console.log(`Running migration: ${targetMigration}`);
    
    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Run only the Answers table migration
      const migration = require(path.join(migrationsDir, targetMigration));
      await migration.up(sequelize.getQueryInterface(), Sequelize);
      
      // Commit the transaction if successful
      await transaction.commit();
      console.log(`✅ Migration ${targetMigration} completed successfully`);
    } catch (error) {
      // Rollback the transaction if migration fails
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
