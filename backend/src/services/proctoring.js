const { Server } = require('socket.io');

let ioInstance = null;
function setupSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('screenshot', (data) => {
      io.emit('student-screenshot', data);
    });
    socket.on('tab-switch', (event) => {
      io.emit('proctor-alert', { userId: event.userId, message: 'Tab switch detected' });
    });
  });
}
function getSocketIO() {
  return ioInstance;
}

module.exports = { setupSocket, getSocketIO }; 