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

      const metrics = require('./metrics');
      const logger = require('./logger');

      io.on('connection', (socket) => {
        try {
          metrics.inc('socket_connections', 1);
          logger.info('Socket conectado', { id: socket.id, userId: socket.userId || null });

          // Auto-join to user room if authenticated (only if not already in)
          if (socket.userId) {
            const room = `user_${socket.userId}`;
            const alreadyIn = (socket.rooms && socket.rooms.has && socket.rooms.has(room)) || Array.from(socket.rooms || []).includes(room);
            if (!alreadyIn) {
              socket.join(room);
              logger.info('Socket joined room', { socketId: socket.id, room });
            }
          }

          // Fallback: allow manual register event (but still validate)
          socket.on('register', (userId) => {
            const uid = userId && (userId._id || userId.id) ? (userId._id || userId.id) : userId;
            if (uid) {
              const room = `user_${uid}`;
              const alreadyIn = (socket.rooms && socket.rooms.has && socket.rooms.has(room)) || Array.from(socket.rooms || []).includes(room);
              if (!alreadyIn) {
                socket.join(room);
                logger.info('Socket joined room via register', { socketId: socket.id, room });
              } else {
                logger.info('Socket already in room, skipping join', { socketId: socket.id, room });
              }
            }
          });

          socket.on('disconnect', () => {
            metrics.inc('socket_disconnections', 1);
            logger.info('Socket desconectado', { id: socket.id });
          });
        } catch (err) {
          logger.warn('Socket connection handler error', { err: err.message || err });
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
