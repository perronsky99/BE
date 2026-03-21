const mongoose = require('mongoose');

/**
 * Transaction - Registro de pagos/escrow para tiritos con precio.
 * En esta versión es carcasa: simula flujo pero no conecta a pasarela real.
 */
const transactionSchema = new mongoose.Schema({
  tiritoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tirito',
    required: true
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['VES', 'USD'],
    default: 'USD'
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'held', 'released', 'refunded', 'disputed', 'mock_completed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['pago_movil', 'transferencia', 'zelle', 'binance_pay', 'mock'],
    default: 'mock'
  },
  paymentRef: {
    type: String,
    default: null
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  escrowReleasedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

transactionSchema.index({ tiritoId: 1 }, { unique: true });
transactionSchema.index({ payerId: 1, status: 1 });
transactionSchema.index({ payeeId: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
