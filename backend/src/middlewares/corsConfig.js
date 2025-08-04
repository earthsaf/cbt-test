const cors = require('cors');

const allowedOrigins = [
  'https://cbt-test.onrender.com',
  'https://cbt-test-frontend.onrender.com',
  'https://cbt-test-api.onrender.com',
  'https://cbt-test-urrr.onrender.com',
  'http://localhost:3000',
  'http://localhost:4000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc) or if in allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('Blocked by CORS:', origin);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);
