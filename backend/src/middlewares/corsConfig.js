const cors = require('cors');

// Allowed origins
const allowedOrigins = [
  'https://cbt-test.onrender.com',
  'https://cbt-test-frontend.onrender.com',
  'https://cbt-test-api.onrender.com',
  'https://cbt-test-urrr.onrender.com',
  'http://localhost:3000',
  'http://localhost:4000'
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // For development, allow all origins - in production, you should restrict this
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('Blocked by CORS:', origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-XSRF-TOKEN',
    'X-CSRF-TOKEN',
    'XMLHttpRequest'
  ],
  exposedHeaders: [
    'set-cookie',
    'xsrf-token',
    'authorization',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection'
  ],
  optionsSuccessStatus: 204, // Use 204 for preflight responses
  preflightContinue: false,
  maxAge: 86400, // 24 hours
  // Add support for legacy browsers
  optionsPreflight: {
    optionsSuccessStatus: 204
  }
};

// Create CORS middleware with error handling
const corsMiddleware = (req, res, next) => {
  const corsHandler = cors(corsOptions);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return corsHandler(req, res, () => res.status(204).end());
  }
  
  // Handle regular requests
  return corsHandler(req, res, next);
};

// Export both the CORS middleware and the allowedOrigins array
module.exports = {
  corsMiddleware,
  allowedOrigins
};

// Also export the CORS middleware as default for backward compatibility
module.exports.default = corsMiddleware;
