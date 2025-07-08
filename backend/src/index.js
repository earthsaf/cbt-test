require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');
const { setupBot } = require('./bot/bot');
const { setupSocket } = require('./services/proctoring');
const bcrypt = require('bcrypt');
const { User } = require('./models');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://cbt-test-urrr.onrender.com', // deployed frontend
  'http://localhost:3000', // local dev
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed from this origin: ' + origin), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api', routes);

setupBot();
setupSocket(server);

const PORT = process.env.PORT || 4000;
sequelize.sync({ alter: true }).then(async () => {
  // Ensure default admin user exists
  const admin = await User.findOne({ where: { role: 'admin' } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('0000', 10);
    await User.create({ username: '0000', passwordHash, role: 'admin', name: 'Default Admin', email: '' });
    console.log('Default admin user created: username=0000, password=0000');
  }
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});