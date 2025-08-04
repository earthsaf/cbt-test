const cors = require('cors');

// Export the allowedOrigins array for use in other files
const allowedOrigins = [
  'https://cbt-test.onrender.com',
  'https://cbt-test-frontend.onrender.com',
  'https://cbt-test-api.onrender.com',
  'https://cbt-test-urrr.onrender.com',
  'http://localhost:3000',
  'http://localhost:4000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
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
    'authorization'
  ],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false,
  maxAge: 86400 // 24 hours
};

// Export both the CORS middleware and the allowedOrigins array
module.exports = {
  corsMiddleware: cors(corsOptions),
  allowedOrigins
};

// Also export the CORS middleware as default for backward compatibility
module.exports.default = cors(corsOptions);
