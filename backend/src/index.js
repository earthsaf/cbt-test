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

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  'https://cbt-test-urrr.onrender.com', // old frontend URL
  'https://cbt-test.onrender.com', // new combined URL
  'http://localhost:3000', // local dev
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests without origin (like mobile apps, curl, etc.)
    // Also allow undefined origin for development and testing
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked CORS requests for debugging
    console.log('Blocked CORS request from origin:', origin);
    return callback(new Error('CORS not allowed from this origin: ' + origin), false);
  },
  credentials: true, // Required for cookies, authorization headers with HTTPS
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-Forwarded-For',
    'X-Forwarded-Proto',
    'X-Forwarded-Port'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'X-CSRF-Token'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with the options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use('/api', routes);

// Serve static files from the React app in production
if (isProduction) {
  const frontendBuildPath = path.join(__dirname, '../../frontend/build');
  console.log('Frontend build path:', frontendBuildPath);

  // Check if frontend build exists
  const fs = require('fs');
  if (fs.existsSync(frontendBuildPath)) {
    console.log('Frontend build found, serving static files');
    
    // Serve static files
    app.use(express.static(frontendBuildPath, { index: false }));
    
    // Handle all other routes by serving index.html
    app.get('*', (req, res) => {
      console.log('Serving index.html for route:', req.path);
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  } else {
    console.log('Frontend build not found at:', frontendBuildPath);
    
    // Fallback route for root path
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Backend is running. Frontend build not found.',
        frontendPath: frontendBuildPath,
        currentDir: __dirname
      });
    });
  }
}

setupBot();

const PORT = process.env.PORT || 4000;
if (!PORT) {
  console.error('Error: PORT environment variable is not set');
  process.exit(1);
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const syncOptions = process.env.NODE_ENV === 'development' ? { force: true } : {};

sequelize.sync(syncOptions).then(async () => {
  console.log('Database synced successfully');
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
}).catch((error) => {
  console.error('Database sync error:', error);
  process.exit(1);
});