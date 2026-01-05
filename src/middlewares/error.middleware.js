const { nodeEnv } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: 'Error de validación',
      errors: messages
    });
  }

  // Error de duplicado (email único, etc.)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `El ${field} ya está registrado`
    });
  }

  // Error de Cast (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'ID inválido'
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expirado'
    });
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    message,
    ...(nodeEnv === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
