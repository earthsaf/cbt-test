const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Always fetch the latest user from the database if needed
    if (payload.id) {
      const user = await User.findByPk(payload.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
    } else {
      req.user = payload;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };