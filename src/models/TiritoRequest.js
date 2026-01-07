const mongoose = require('mongoose');

/**
 * TiritoRequest - Solicitud para realizar un tirito
 * Flujo:
 * 1. Usuario ve un tirito abierto y solicita hacerlo (status: pending)
 * 2. Creador del tirito ve las solicitudes en su bandeja
 * 3. Creador acepta (accepted) o rechaza (rejected) la solicitud
 * 4. Si acepta, el tirito pasa a in_progress con assignedTo
 */
const tiritoRequestSchema = new mongoose.Schema({
  tirito: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tirito',
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
tiritoRequestSchema.index({ tirito: 1, requester: 1 }, { unique: true });
tiritoRequestSchema.index({ tirito: 1, status: 1 });

module.exports = mongoose.model('TiritoRequest', tiritoRequestSchema);
