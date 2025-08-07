const { Sequelize, DataTypes } = require('sequelize');
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

const initDatabase = async () => {
  try {
    // Initialize Sequelize
    sequelize = new Sequelize(process.env.DATABASE_URL, dbConfig);
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Import models
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
        validate: { isEmail: true }
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
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Sync all models
    await sequelize.sync();
    console.log('✅ Database synchronized');

    // Create default admin if not exists
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cbt-system.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@1234';
    
    const [admin] = await User.findOrCreate({
      where: { email: adminEmail, role: 'admin' },
      defaults: {
        username: 'admin',
        name: 'System Administrator',
        password_hash: await require('bcrypt').hash(adminPassword, 10),
        active: true
      }
    });

    if (admin.wasCreated) {
      console.log('✅ Default admin user created');
      console.log('================================');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('================================');
      console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    }

    return { sequelize, User };

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    if (error.original) {
      console.error('Database error details:', error.original);
    }
    process.exit(1);
  }
};

// Export the initialization function and sequelize instance
module.exports = {
  sequelize: null, // Will be set after init
  initDatabase,
  models: {}
};

// Initialize the database when this module is imported
initDatabase().then(({ sequelize: db, User }) => {
  module.exports.sequelize = db;
  module.exports.models.User = User;
  console.log('✅ Database initialization complete');});
