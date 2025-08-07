const socket = require('socket.io');
const jwt = require('jsonwebtoken');
const { allowedOrigins } = require('../middlewares/corsConfig');

let io;

const authMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

module.exports = {
  init: (server) => {
    io = socket(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true
      },
      allowEIO3: true,
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000 // 25 seconds
    });

    // Apply authentication middleware
    io.use(authMiddleware);

    // Handle connections
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Join user to their own room
      if (socket.user?.id) {
        socket.join(`user:${socket.user.id}`);
      }

      // Handle exam room joining
      socket.on('join-exam', (examId) => {
        socket.join(`exam:${examId}`);
        console.log(`Socket ${socket.id} joined exam:${examId}`);
      });

      // Handle exam room leaving
      socket.on('leave-exam', (examId) => {
        socket.leave(`exam:${examId}`);
        console.log(`Socket ${socket.id} left exam:${examId}`);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error: ${socket.id}`, error);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    return io;
  },

  // Utility function to emit to a specific user
  emitToUser: (userId, event, data) => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    io.to(`user:${userId}`).emit(event, data);
  },

  // Utility function to emit to an exam room
  emitToExam: (examId, event, data) => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    io.to(`exam:${examId}`).emit(event, data);
  }
};
