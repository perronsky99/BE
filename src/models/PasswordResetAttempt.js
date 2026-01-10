const mongoose = require('mongoose');

const PasswordResetAttemptSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PasswordResetAttempt', PasswordResetAttemptSchema);
