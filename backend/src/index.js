require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');
const { setupBot } = require('./bot/bot');
const { setupSocket } = require('./services/proctoring');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use('/api', routes);

setupBot();
setupSocket(server);

const PORT = process.env.PORT || 4000;
sequelize.sync().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 