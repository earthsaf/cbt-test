const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL if available, otherwise fall back to individual env vars
const sequelize = new Sequelize(process.env.DATABASE_URL || {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
}, {
  ssl: process.env.NODE_ENV === 'production' ? {
    require: true,
    rejectUnauthorized: false
  } : false
});

module.exports = sequelize;
