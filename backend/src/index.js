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

const app = express();
const server = http.createServer(app);

// CORS configuration - allow all origins for now
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

// Increase the limit for JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '***REDACTED***' : undefined,
      cookie: req.headers.cookie ? '***REDACTED***' : undefined
    },
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.IO
const io = socketService.init(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});

// Initialize socket connection handling
setupBot(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    ...(process.env.NODE_ENV === 'development' && { fullError: err })
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Serve static files from the React app in production
const isProduction = process.env.NODE_ENV === 'production';

// API routes should always be available
app.use('/api', routes);

if (isProduction) {
  const frontendBuildPath = path.join(__dirname, '../../frontend/build');
  console.log('Frontend build path:', frontendBuildPath);
  
  // Check if the frontend build directory exists
  const fs = require('fs');
  if (fs.existsSync(frontendBuildPath)) {
    console.log('Serving frontend from:', frontendBuildPath);
    
    // Serve static files from the React app
    app.use(express.static(frontendBuildPath, {
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Set cache control headers for static assets
        if (path.endsWith('.html')) {
          // Don't cache HTML files
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
        } else {
          // Cache other static assets for 1 year
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      }
    }));
    
    // Handle React routing, return all other requests to React app
    // This must come after the static files middleware
    app.get('*', (req, res) => {
      console.log(`[${new Date().toISOString()}] Serving index.html for route: ${req.originalUrl}`);
      res.sendFile(path.join(frontendBuildPath, 'index.html'), {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        },
        lastModified: false,
        etag: false
      }, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Failed to load application',
              message: 'An error occurred while loading the application.'
            });
          }
        }
      });
    });
  } else {
    console.warn('Frontend build directory not found at:', frontendBuildPath);
    
    // If frontend build is not found, at least serve a basic message
    app.get('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Frontend not built',
        message: 'The frontend build directory was not found. Please build the frontend before starting the server.'
      });
    });
  }
}

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