const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'https://cbt-test.onrender.com',
  'https://cbt-test.onrender.com/',
  'https://cbt-test-frontend.onrender.com',
  'https://cbt-test-frontend.onrender.com/'
];

const corsMiddleware = cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin ends with any of our allowed domains
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || origin.endsWith('.onrender.com')
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 3600
});

module.exports = corsMiddleware;
