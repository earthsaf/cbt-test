const { Sequelize } = require('sequelize');
require('dotenv').config();

// Construct DATABASE_URL with SSL parameters
const databaseUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

module.exports = new Sequelize(databaseUrl, {
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false
    }
  },
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});
