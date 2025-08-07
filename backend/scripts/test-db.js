const { initDatabase, sequelize } = require('../src/config/database');
const User = require('../src/models/user')(sequelize);

async function testDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    await initDatabase();
    
    console.log('✅ Database connected successfully');
    
    // Test User model
    console.log('\n🧪 Testing User model...');
    
    // Test password hashing
    const testPassword = 'Test@1234';
    const hashedPassword = await User.hashPassword(testPassword);
    console.log('🔑 Password hashing test:', 
      hashedPassword ? '✅ Success' : '❌ Failed');
    
    // Test password verification
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log('🔍 Password verification test:', 
      isMatch ? '✅ Success' : '❌ Failed');
    
    // Test password validation
    const isValid = User.isPasswordValid(testPassword);
    console.log('🔒 Password validation test:', 
      isValid ? '✅ Valid' : '❌ Invalid');
    
    // Test model instance methods
    const testUser = await User.create({
      email: 'test@example.com',
      password: testPassword,
      name: 'Test User',
      role: 'student'
    });
    
    console.log('👤 User creation test:', 
      testUser ? '✅ Success' : '❌ Failed');
    
    // Test password verification on instance
    const isPasswordValid = await testUser.verifyPassword(testPassword);
    console.log('🔑 Instance password verification:', 
      isPasswordValid ? '✅ Success' : '❌ Failed');
    
    // Clean up
    await testUser.destroy();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🏁 Tests completed');
    process.exit(0);
  }
}

testDatabase();
