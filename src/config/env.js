require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Validar secretos críticos en producción
if (nodeEnv === 'production') {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret === 'default_secret_change_me' || jwtSecret.length < 32) {
    console.error('❌ FATAL: JWT_SECRET debe ser seguro en producción (mínimo 32 caracteres)');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('❌ FATAL: MONGODB_URI es requerido en producción');
    process.exit(1);
  }
  if (!process.env.FRONTEND_URL) {
    console.error('❌ FATAL: FRONTEND_URL es requerido en producción');
    process.exit(1);
  }
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tirito-app',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  }
};
