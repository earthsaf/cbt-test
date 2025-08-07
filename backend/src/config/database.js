const { Sequelize } = require('sequelize');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please configure your database connection.');
}

const dbConfig = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
};

let sequelize;

try {
  sequelize = new Sequelize(process.env.DATABASE_URL, dbConfig);
  
  // Test the connection
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error.message);
      console.error('Connection details:', {
        host: process.env.DB_HOST || 'Not set',
        database: process.env.DB_NAME || 'Not set',
        username: process.env.DB_USER || 'Not set',
        port: process.env.DB_PORT || 'Not set'
      });
      process.exit(1);
    }
  })();
} catch (error) {
  console.error('Failed to initialize database connection:', error.message);
  process.exit(1);
}

module.exports = sequelize;

