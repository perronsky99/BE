const mongoose = require('mongoose');

const PasswordResetAttemptSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now }
});

// Auto-eliminar después de 1 hora
PasswordResetAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('PasswordResetAttempt', PasswordResetAttemptSchema);
