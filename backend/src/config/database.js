const { Sequelize } = require('sequelize');
require('dotenv').config();

// Check if DATABASE_URL is provided
const databaseUrl = process.env.DATABASE_URL;

// If DATABASE_URL is provided, use it directly
if (databaseUrl) {
  module.exports = new Sequelize(databaseUrl, {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  });
} else {
  // Otherwise use individual environment variables
  module.exports = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    },
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  });
}
