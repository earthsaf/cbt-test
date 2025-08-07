require('dotenv').config();
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Import configuration and middleware
const { initDatabase } = require('./config/database');
const routes = require('./routes');
const { setupBot } = require('./bot/bot');
const socketService = require('./services/socket');
const securityHeaders = require('./middlewares/securityHeaders');
const { corsMiddleware } = require('./middlewares/corsConfig');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Apply security middleware first
app.set('trust proxy', 1); // Important for secure cookies in production
app.use(securityHeaders);
app.use(corsMiddleware);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', routes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../frontend/build');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
    console.log('Serving frontend from:', frontendBuildPath);
  } else {
    console.warn('Frontend build directory not found at:', frontendBuildPath);
  }
}

// Initialize Socket.IO
const io = socketService.init(server);
setupBot(io);

// Global error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', { 
    message: err.message, 
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
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

// Server startup
const startServer = async () => {
  try {
    // Initialize database and create default admin if needed
    await initDatabase();
    
    const PORT = process.env.PORT || 4000;
    if (!PORT) {
      throw new Error('PORT environment variable is not set');
    }

    server.listen(PORT, () => {
      console.log(`\n✅ Server is running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🔗 http://localhost:${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log('🚀 Ready to handle requests!\n');
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server }; // For testing