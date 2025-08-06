const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;
const dbConfig = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
};

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, dbConfig);
} else {
  // Construct URL from individual parameters
  const url = `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  sequelize = new Sequelize(url, dbConfig);
}

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = sequelize;
