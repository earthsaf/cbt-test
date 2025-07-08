const jwt = require('jsonwebtoken');

// Middleware to check JWT in HttpOnly cookie
async function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Optionally fetch user from DB if needed
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };
