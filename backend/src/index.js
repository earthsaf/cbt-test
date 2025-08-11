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
const { initTelegramBot } = require('./bot');
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

// Debug endpoint to check directory structure
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const projectRoot = path.join(__dirname, '../..');
  const frontendPath = path.join(projectRoot, 'frontend');
  const frontendBuildPath = path.join(frontendPath, 'build');
  
  try {
    const dirs = {
      projectRoot: {
        exists: fs.existsSync(projectRoot),
        files: fs.readdirSync(projectRoot)
      },
      frontendPath: {
        exists: fs.existsSync(frontendPath),
        files: fs.readdirSync(frontendPath)
      },
      frontendBuildPath: {
        exists: fs.existsSync(frontendBuildPath),
        files: fs.existsSync(frontendBuildPath) ? fs.readdirSync(frontendBuildPath) : []
      }
    };
    
    res.status(200).json(dirs);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      cwd: process.cwd(),
      __dirname: __dirname
    });
  }
});

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
  // Possible build locations to check
  const possibleBuildPaths = [
    // Current working directory structure (from debug output)
    path.join(process.cwd(), 'frontend/build'),
    // Alternative paths for different environments
    path.join(__dirname, '../../frontend/build'),
    path.join(__dirname, '../frontend/build'),
    path.join(process.cwd(), 'build')
  ];
  
  console.log('Checking for frontend build in:', possibleBuildPaths);

  let frontendServed = false;
  
  // Try each possible build path
  for (const buildPath of possibleBuildPaths) {
    const indexPath = path.join(buildPath, 'index.html');
    
    console.log(`Checking path: ${buildPath}`);
    console.log(`Index exists: ${fs.existsSync(indexPath)}, Build exists: ${fs.existsSync(buildPath)}`);
    
    if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
      console.log(`✅ Found valid frontend build at: ${buildPath}`);
      console.log(`📄 Index file: ${indexPath}`);
      // Serve static files with proper caching headers
      app.use(express.static(buildPath, {
        maxAge: '1d', // Cache static assets for 1 day
        etag: true,
        lastModified: true
      }));

      // Serve index.html for all routes (SPA support)
      app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
          return next();
        }

        res.sendFile(indexPath, {
          maxAge: '0', // Don't cache index.html
          etag: true,
          lastModified: true
        });
      });
      
      console.log('✅ Serving frontend from:', buildPath);
      frontendServed = true;
      break;
    }
  }
  
  if (!frontendServed) {
    console.warn('⚠️ Frontend build directory not found in any of these locations:', possibleBuildPaths);
    
    // Serve a simple maintenance page with instructions
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>System Maintenance</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                line-height: 1.6;
              }
              h1 { color: #e74c3c; }
              .container { max-width: 800px; margin: 0 auto; }
              code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>System Maintenance</h1>
              <p>We're currently experiencing technical difficulties. Please try again later.</p>
              <p>If you're the system administrator, please check the following:</p>
              <ol style="text-align: left; max-width: 600px; margin: 20px auto;">
                <li>Ensure the frontend was built successfully</li>
                <li>Check the build output directory exists and contains <code>index.html</code></li>
                <li>Verify the build directory is accessible to the server</li>
              </ol>
              <p>For more information, check the server logs or visit the <a href="/debug">debug page</a>.</p>
            </div>
          </body>
        </html>
      `);
    });
  }
}

// Initialize Socket.IO with error handling
const io = socketService.init(server);
io.on('error', (error) => {
  console.error('Socket.IO error:', error);
});

io.on('connection', (socket) => {
  socket.on('error', (error) => {
    console.error('Socket connection error:', error);
  });
});

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
const validatePort = (port) => {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum)) {
    throw new Error(`Invalid PORT value: ${port}. Must be a number.`);
  }
  if (portNum < 1 || portNum > 65535) {
    throw new Error(`Invalid PORT value: ${port}. Must be between 1 and 65535.`);
  }
  return portNum;
};

const startServer = async () => {
  try {
    // Initialize database and create default admin if needed
    await initDatabase();
    
    const PORT = validatePort(process.env.PORT || '4000');
    
    // Verify server can bind to the port
    await new Promise((resolve, reject) => {
      const testServer = require('http').createServer();
      testServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${PORT} is already in use. Please free the port or specify a different one.`));
        } else {
          reject(new Error(`Failed to start server on port ${PORT}: ${err.message}`));
        }
      });
      testServer.listen(PORT, () => {
        testServer.close(resolve);
      });
    });

    // Use '0.0.0.0' as host to work in Docker/containerized environments
    const HOST = process.env.HOST || '0.0.0.0';
    
    server.listen(PORT, HOST, () => {
      console.log(`\n✅ Server is running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🔗 http://${HOST}:${PORT}`);
      console.log(`📡 API: http://${HOST}:${PORT}/api`);
      console.log('🚀 Ready to handle requests!\n');
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
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