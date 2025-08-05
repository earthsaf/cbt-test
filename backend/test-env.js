require('dotenv').config();

console.log('=== Environment Variables Test ===\n');

// Check critical environment variables
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DB_USER',
  'DB_PASS',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'JWT_SECRET'
];

console.log('Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? 'SET' : 'NOT SET'}`);
});

console.log('\n=== Database Connection Test ===');

const { Sequelize } = require('sequelize');

async function testDatabase() {
  try {
    const databaseUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;
    
    console.log('Database URL:', databaseUrl.replace(process.env.DB_PASS, '***'));
    
    const sequelize = new Sequelize(databaseUrl, {
      dialectOptions: {
        ssl: {
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test if Users table exists and has admin user
    const { User } = require('./src/models');
    
    try {
      const admin = await User.findOne({ where: { role: 'admin', username: 'admin' } });
      console.log('✅ Admin user exists:', !!admin);
      
      if (admin) {
        console.log('Admin details:', {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          name: admin.name
        });
      }
    } catch (error) {
      console.log('❌ Error checking admin user:', error.message);
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDatabase(); 