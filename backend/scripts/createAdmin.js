require('dotenv').config({ path: '../.env' }); // Make sure to load the correct .env file
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');

// Database configuration
const dbConfig = {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
};

// Initialize Sequelize with retry logic
let sequelize;
try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  sequelize = new Sequelize(process.env.DATABASE_URL, dbConfig);
  console.log('Database connection established successfully');
} catch (error) {
  console.error('Failed to connect to database:', error.message);
  console.error('Please check your DATABASE_URL in the .env file');
  process.exit(1);
}

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users', // Make sure this matches your actual table name
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Admin credentials
const ADMIN_EMAIL = 'admin@cbt-system.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@1234'; // Change this after first login
const ADMIN_NAME = 'System Administrator';

async function createAdmin() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Checking for existing admin user...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      where: { 
        role: 'admin',
        [Sequelize.Op.or]: [
          { email: ADMIN_EMAIL },
          { username: ADMIN_USERNAME }
        ]
      },
      transaction
    });

    if (existingAdmin) {
      console.log('\nℹ️  Admin user already exists with these details:');
      console.log('================================');
      console.log(`Username: ${existingAdmin.username}`);
      console.log(`Email: ${existingAdmin.email}`);
      console.log('================================');
      console.log('\nIf you need to reset the password, please use the password reset functionality.\n');
      await transaction.rollback();
      return;
    }

    // Create new admin
    console.log('Creating new admin user...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    const admin = await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      name: ADMIN_NAME,
      role: 'admin',
      active: true
    }, { transaction });

    await transaction.commit();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('================================');
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('================================');
    console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!');
    
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error creating admin user:', error.message);
    if (error.original) {
      console.error('Database error:', error.original);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the script
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to the database');
    await createAdmin();
  } catch (error) {
    console.error('Failed to initialize database connection:', error.message);
    if (error.original) {
      console.error('Original error:', error.original);
    }
    process.exit(1);
  }
})();
