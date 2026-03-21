let io = null;

module.exports = {
  init(server) {
    try {
      const { Server } = require('socket.io');
      const jwtUtil = require('./jwt');
      const { frontendUrl } = require('../config/env');

      const allowedOrigins = frontendUrl
        ? frontendUrl.split(',').map(o => o.trim())
        : ['http://localhost:4200'];

      io = new Server(server, {
        cors: {
          origin: allowedOrigins,
          credentials: true
        }
      });

      io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) return next(new Error('Token requerido'));

        const payload = jwtUtil.verifyToken(token);
        if (!payload) return next(new Error('Unauthorized'));

        socket.userId = payload.sub;
        return next();
      });

      const metrics = require('./metrics');
      const logger = require('./logger');

      io.on('connection', (socket) => {
        try {
          metrics.inc('socket_connections', 1);
          logger.info('Socket conectado', { id: socket.id, userId: socket.userId });

          // Auto-join solo a su propia sala
          if (socket.userId) {
            socket.join(`user_${socket.userId}`);
          }

          // Register manual: solo permite unirse a su propia sala
          socket.on('register', (userId) => {
            const uid = userId && (userId._id || userId.id) ? (userId._id || userId.id) : userId;
            if (!uid || String(uid) !== String(socket.userId)) {
              logger.warn('Socket register denied: uid mismatch', { socketUserId: socket.userId, requestedUid: uid });
              return;
            }
            socket.join(`user_${uid}`);
          });

          socket.on('disconnect', () => {
            metrics.inc('socket_disconnections', 1);
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
