const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'https://cbt-test.onrender.com',
  'https://cbt-test-frontend.onrender.com'
];

const corsMiddleware = cors({
  origin: function(origin, callback) {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production checks
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With'
  ],
  credentials: true,
  optionsSuccessStatus: 200
});

module.exports = corsMiddleware;
