const jwt = require('jsonwebtoken');
const config = require('../config/config');

let ioInstance = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  ioInstance = io;

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated connection for public discovery rooms if needed, but flag it
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      // Token invalid, allow anonymous or reject
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.user ? socket.user.role : 'guest'})`);

    // Join Contest Room
    socket.on('join_contest', ({ eventId }) => {
      if (!eventId) return;

      // If user is a participant, ensure they belong to this event
      if (socket.user && socket.user.role === 'participant') {
        if (socket.user.eventId !== eventId) {
          socket.emit('error', { message: 'Unauthorized room access.' });
          return;
        }
      }

      socket.join(`contest_${eventId}`);
      console.log(`[Socket] ${socket.id} joined contest_${eventId}`);
    });

    // Join Participant Private Room (for targeted personal notifications)
    socket.on('join_personal', () => {
      if (socket.user && socket.user.id) {
        socket.join(`user_${socket.user.id}`);
        console.log(`[Socket] ${socket.id} joined private room user_${socket.user.id}`);
      }
    });

    socket.on('leave_contest', ({ eventId }) => {
      if (eventId) {
        socket.leave(`contest_${eventId}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
}

function getIo() {
  return ioInstance;
}

// Broadcast helpers
function emitToContest(eventId, eventName, payload) {
  if (ioInstance) {
    ioInstance.to(`contest_${eventId}`).emit(eventName, payload);
  }
}

function emitToUser(userId, eventName, payload) {
  if (ioInstance) {
    ioInstance.to(`user_${userId}`).emit(eventName, payload);
  }
}

module.exports = {
  initSocket,
  getIo,
  emitToContest,
  emitToUser
};
