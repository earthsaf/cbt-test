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
    // Allow requests with no origin (like mobile apps, curl requests, or server-side requests)
    if (!origin && process.env.NODE_ENV === 'development') {
      console.log('No origin - allowing in development');
      return callback(null, true);
    }
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      console.log('Allowed origin:', origin);
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('Blocked by CORS:', origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-XSRF-TOKEN',
    'Accept',
    'Origin',
    'X-Access-Token',
    'X-Refresh-Token',
    'x-client-version',
    'x-client-name',
    'x-auth-token',
    'x-xsrf-token',
    'x-csrf-token',
    'x-request-id',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-port'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'x-auth-token',
    'x-xsrf-token',
    'x-csrf-token',
    'x-request-id'
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  preflightContinue: false,
  maxAge: 600 // 10 minutes
};

// Create CORS middleware with error handling
const corsMiddleware = (req, res, next) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.status(200).json({});
    }
  }
  
  // Apply CORS for actual requests
  cors(corsOptions)(req, res, next);
};

// Export both the CORS middleware and the allowedOrigins array
module.exports = {
  corsMiddleware,
  allowedOrigins,
  corsOptions
};
