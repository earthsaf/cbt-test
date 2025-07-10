const { Sequelize } = require('sequelize');
require('dotenv').config();

// Construct DATABASE_URL from environment variables
const databaseUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

module.exports = new Sequelize(databaseUrl, {
  ssl: process.env.NODE_ENV === 'production' ? {
    require: true,
    rejectUnauthorized: false
  } : false
});
