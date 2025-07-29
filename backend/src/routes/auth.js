const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');
const router = express.Router();

// Add middleware to parse JSON bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? '***REDACTED***' : undefined,
      'cookie': req.headers['cookie'] ? '***REDACTED***' : undefined
    }
  });
  next();
});

router.post('/login', (req, res, next) => {
  console.log('Login request body:', req.body);
  console.log('Login request headers:', req.headers);
  
  // Ensure required fields are present
  if (!req.body.username || !req.body.password) {
    console.log('Missing required fields:', {
      username: !!req.body.username,
      password: !!req.body.password
    });
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }
  
  // Call the controller
  authController.login(req, res, next);
});

router.get('/test', requireAuth, authController.testAuth);

module.exports = router;