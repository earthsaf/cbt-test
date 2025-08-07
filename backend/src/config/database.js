const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please ensure these are set in your .env file or deployment environment');
  process.exit(1);
}

// Parse DATABASE_URL for better error messages
let dbConfig;
try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  // For Render's PostgreSQL, we need to ensure SSL is properly configured
  dbConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    database: dbUrl.pathname.replace(/^\//, ''),
    username: dbUrl.username,
    password: dbUrl.password,
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false  // For self-signed certificates
      },
      // Additional options for better connection handling
      keepAlive: true,
      connectionTimeoutMillis: 10000,
      idle_in_transaction_session_timeout: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,  // Increased from 30000
      idle: 10000
    },
    // Add retry logic at the connection level
    retry: {
      max: 5,  // Maximum number of retries
      timeout: 30000,  // Time to wait before retrying (ms)
      match: [
        // List of error codes to retry on
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ]
    }
  };
  
  console.log(`🔌 Database connection configured for ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
} catch (error) {
  console.error('❌ Invalid DATABASE_URL format:', error.message);
  console.error('Expected format: postgresql://username:password@host:port/database');
  process.exit(1);
}

// Create and configure Sequelize instance
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'postgres',
  dialectOptions: dbConfig.dialectOptions,
  logging: dbConfig.logging,
  pool: dbConfig.pool
});

const createDefaultAdmin = async (User) => {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cbt-system.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@1234';
    
    const [admin] = await User.findOrCreate({
      where: { email: adminEmail, role: 'admin' },
      defaults: {
        username: 'admin',
        name: 'System Administrator',
        password_hash: await bcrypt.hash(adminPassword, 10),
        active: true
      }
    });

    if (admin.wasCreated) {
      console.log('✅ Default admin user created');
      console.log('================================');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('================================');
      console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    }

    return admin;
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  }
};

const initDatabase = async () => {
  try {
    // Import models after sequelize is initialized
    const { User } = require('../models');
    
    // Test the connection with retry logic
    const maxRetries = 5;
    let retryCount = 0;
    let lastError;
    
    while (retryCount < maxRetries) {
      try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`⚠️  Connection attempt ${retryCount} failed, retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    if (lastError) {
      throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${lastError.message}`);
    }

    // Import models - this will automatically initialize them
    const models = require('../models');
    
    // The models are already initialized when required, but we need to ensure associations are set up
    // The associations are already set up in models/index.js
    
    // Sync all models
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('✅ Database synchronized');

    // Create default admin if not exists
    await createDefaultAdmin(models.User);
    
    return { sequelize, User };

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    if (error.original) {
      console.error('Database error details:', error.original);
    }
    process.exit(1);
  }
};

// Export the sequelize instance and initialization function
module.exports = {
  sequelize,
  initDatabase
};
