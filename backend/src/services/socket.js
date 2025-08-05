const socket = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socket(server, {
      cors: {
        origin: true, // Allow all origins for Socket.IO
        methods: ['GET', 'POST'],
        credentials: true
      },
      allowEIO3: true
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
