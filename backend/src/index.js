require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');
const { setupBot } = require('./bot/bot');
const socketService = require('./services/socket');
const bcrypt = require('bcrypt');
const { User } = require('./models');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketService.init(server);

const allowedOrigins = [
  'https://cbt-test-urrr.onrender.com', // deployed frontend
  'https://cbt-test.onrender.com', // deployed backend (if you ever host frontend here)
  'http://localhost:3000', // local dev
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed from this origin: ' + origin), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api', routes);

// Serve static files from the React app
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
console.log('Frontend build path:', frontendBuildPath);

// Check if frontend build exists
const fs = require('fs');
if (fs.existsSync(frontendBuildPath)) {
  console.log('Frontend build found, serving static files');
  app.use(express.static(frontendBuildPath));

  // Serve index.html for non-API GET requests (for React Router)
  app.get(/^\/((?!api).)*$/, (req, res) => {
    console.log('Serving index.html for route:', req.path);
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  console.log('Frontend build not found at:', frontendBuildPath);
  console.log('Current directory:', __dirname);
  
  // Fallback route for root path
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Backend is running. Frontend build not found.',
      frontendPath: frontendBuildPath,
      currentDir: __dirname
    });
  });
}

setupBot();

const PORT = process.env.PORT || 4000;
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

sequelize.sync({ force: true }).then(async () => {
  console.log('Database synced successfully');
  // Ensure default admin user exists
  const admin = await User.findOne({ where: { role: 'admin' } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('0000', 10);
    await User.create({ 
      username: '0000', 
      password_hash: passwordHash, 
      role: 'admin', 
      name: 'Default Admin', 
      email: '' 
    });
    console.log('Default admin user created: username=0000, password=0000');
  }
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Database sync error:', error);
  process.exit(1);
});
  if (!admin) {
    const passwordHash = await bcrypt.hash('0000', 10);
    await User.create({ 
      username: '0000', 
      password_hash: passwordHash, 
      role: 'admin', 
      name: 'Default Admin', 
      email: '' 
    });
    console.log('Default admin user created: username=0000, password=0000');
  }
  
  // Create default admin user if not exists
  try {
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('0000', 10);
      await User.create({ 
        username: '0000', 
        password_hash: passwordHash, 
        role: 'admin', 
        name: 'Default Admin', 
        email: '' 
      });
      console.log('Default admin user created: username=0000, password=0000');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});