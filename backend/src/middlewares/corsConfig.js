const cors = require('cors');

const allowedOrigins = [
  'https://cbt-test.onrender.com',
  'https://cbt-test-frontend.onrender.com',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
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
