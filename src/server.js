const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('📁 Carpeta uploads creada');
}

let server;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} recibido. Cerrando servidor...`);
  if (server) {
    server.close(() => {
      logger.info('Conexiones HTTP cerradas');
      const mongoose = require('mongoose');
      mongoose.connection.close(false).then(() => {
        logger.info('MongoDB desconectado');
        process.exit(0);
      });
    });
    // Forzar cierre después de 10s
    setTimeout(() => {
      logger.error('Forzando cierre después de timeout');
      process.exit(1);
    }, 10000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

// Conectar a MongoDB y arrancar servidor
const startServer = async () => {
  try {
    await connectDB();
    
    const http = require('http');
    server = http.createServer(app);
    // Inicializar socket.io
    const socketUtil = require('./utils/socket');
    socketUtil.init(server);

    // Iniciar cron de digest diario
    const { startDigestCron } = require('./cron/digestCron');
    startDigestCron();

    server.listen(port, () => {
      logger.info(`🚀 Servidor corriendo en http://localhost:${port}`);
      logger.info(`📋 Health check: http://localhost:${port}/api/health`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor', { error: error.message });
    process.exit(1);
  }
};

startServer();
