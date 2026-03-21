const mongoose = require('mongoose');
const { mongoUri } = require('./env');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      logger.info('✅ MongoDB conectado correctamente');

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB desconectado, intentando reconectar...');
      });

      return;
    } catch (error) {
      logger.error(`❌ Intento ${attempt}/${retries} - Error conectando a MongoDB: ${error.message}`);
      if (attempt === retries) {
        logger.error('❌ No se pudo conectar a MongoDB después de todos los intentos');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
};

module.exports = connectDB;
