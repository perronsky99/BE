const mongoose = require('mongoose');
const crypto = require('crypto');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'registered', 'first_tirito', 'rewarded'],
    default: 'pending'
  },
  rewardAmount: {
    type: Number,
    default: 1 // $1 USD de crédito
  },
  rewardCurrency: {
    type: String,
    default: 'USD'
  }
}, { timestamps: true });

referralSchema.index({ referrerId: 1 });
referralSchema.index({ code: 1 }, { unique: true });
referralSchema.index({ referredId: 1 });

// Generador de código de referido
referralSchema.statics.generateCode = function(username) {
  const base = (username || 'TIRITO').substring(0, 6).toUpperCase();
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${base}${suffix}`;
};

module.exports = mongoose.model('Referral', referralSchema);
