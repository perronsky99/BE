let io = null;

module.exports = {
  init(server) {
    try {
      const { Server } = require('socket.io');
      const jwtUtil = require('./jwt');

      io = new Server(server, {
        cors: {
          origin: '*'
        }
      });

      io.use((socket, next) => {
        // Esperamos token en handshake.auth.token
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) return next(); // allow anonymous for now, but won't auto-join

        const payload = jwtUtil.verifyToken(token);
        if (!payload) return next(new Error('Unauthorized'));

        // Attach user id to socket for later use
        socket.userId = payload.sub;
        return next();
      });

      io.on('connection', (socket) => {
        try {
          console.log('Socket conectado:', socket.id, 'userId=', socket.userId || 'anon');

          // Auto-join to user room if authenticated
          if (socket.userId) {
            socket.join(`user_${socket.userId}`);
            console.log(`Socket ${socket.id} se unió a room user_${socket.userId}`);
          }

          // Fallback: allow manual register event (but still validate)
          socket.on('register', (userId) => {
            const uid = userId && (userId._id || userId.id) ? (userId._id || userId.id) : userId;
            if (uid) {
              socket.join(`user_${uid}`);
              console.log(`Socket ${socket.id} se unió a room user_${uid} via register`);
            }
          });

          socket.on('disconnect', () => {
            console.log('Socket desconectado:', socket.id);
          });
        } catch (err) {
          console.warn('Socket connection handler error:', err.message || err);
        }
      });

      return io;
    } catch (err) {
      console.error('Socket.io init error:', err);
      return null;
    }
  },
  getIO() {
    return io;
  }
};
