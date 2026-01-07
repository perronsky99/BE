const mongoose = require('mongoose');

/**
 * Modelo de Notificación
 * Tipos de notificación:
 * - chat_new: Alguien te contactó por un tirito
 * - chat_message: Nuevo mensaje en un chat existente
 * - tirito_interest: Alguien mostró interés en tu tirito
 * - tirito_request: Solicitud para hacer un tirito
 * - request_accepted: Solicitud de tirito aceptada
 * - request_rejected: Solicitud de tirito rechazada
 */
const notificationSchema = new mongoose.Schema({
  // Usuario que recibe la notificación
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Tipo de notificación
  type: {
    type: String,
    enum: ['chat_new', 'chat_message', 'tirito_interest', 'tirito_request', 'request_accepted', 'request_rejected'],
    required: true
  },
  // Título de la notificación
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  // Mensaje/descripción
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  // Usuario que generó la acción (quien contactó, envió mensaje, etc.)
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Referencia al tirito relacionado (opcional)
  tiritoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tirito'
  },
  // Referencia al chat relacionado (opcional)
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  // URL de navegación al hacer clic
  actionUrl: {
    type: String,
    required: true
  },
  // Estado de lectura
  read: {
    type: Boolean,
    default: false
  },
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para consultas eficientes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
