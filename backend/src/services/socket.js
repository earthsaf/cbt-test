const socket = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socket(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
      }
    });
    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    return io;
  }
};
