require('dotenv').config();

console.log('=== Deployment Debug Script ===\n');

// Check environment variables
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
console.log('DB_PASS:', process.env.DB_PASS ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');

console.log('\n=== Database Connection Test ===');

const { Sequelize } = require('sequelize');

// Test database connection
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
    
    // Test if tables exist
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('📋 Existing tables:', tables.map(t => t.table_name));
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testDatabase(); 