require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');
const routes = require('./routes');
const { sequelize } = require('./models');
const { setupBot } = require('./bot/bot');
const socketService = require('./services/socket');
const bcrypt = require('bcrypt');
const { User } = require('./models');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'https://cbt-test.onrender.com',
  'https://cbt-test-api.onrender.com',
  'https://cbt-test-frontend.onrender.com',
  'https://cbt-test-urrr.onrender.com'
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('Blocked CORS request from origin:', origin);
    return callback(new Error('CORS not allowed from this origin: ' + origin), false);
  },
  credentials: true, // This is important for cookies, authorization headers with HTTPS
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-CSRF-Token', 
    'X-Forwarded-For', 
    'X-Forwarded-Proto', 
    'X-Forwarded-Port',
    'Set-Cookie',
    'Cookie'
  ],
  exposedHeaders: [
    'Content-Length', 
    'Content-Type', 
    'Authorization', 
    'X-CSRF-Token',
    'Set-Cookie'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with the above options
app.use(cors(corsOptions));

// Enable pre-flight across-the-board
app.options('*', cors(corsOptions));

// Trust first proxy (important for secure cookies in production)
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Frontend Serving Logic ---
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  // Serve static files from the React app
  app.use(express.static(frontendBuildPath));

  // The "catchall" handler: for any request that doesn't match one above,
  // send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
  console.log('Serving frontend from:', frontendBuildPath);
} else {
  console.warn('Frontend build directory not found at:', frontendBuildPath);
}

// Initialize Socket.IO
const io = socketService.init(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true
});

// Initialize socket connection handling
setupBot(io);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', { message: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler for any unhandled routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// --- Server Initialization ---
const PORT = process.env.PORT || 4000;
if (!PORT) {
  console.error('Error: PORT environment variable is not set');
  process.exit(1);
}

sequelize.sync().then(async () => {
  console.log('Database synced successfully');
  // Create default admin if not exists
  try {
    const admin = await User.findOne({ where: { role: 'admin', username: 'admin' } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('0000', 10);
      await User.create({ 
        username: 'admin', 
        password_hash: passwordHash, 
        role: 'admin', 
        name: 'Administrator', 
        email: 'admin@example.com' 
      });
      console.log('Default admin user created: username=admin, password=0000');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
  
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Database sync error:', error);
  process.exit(1);
});