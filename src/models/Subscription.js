const mongoose = require('mongoose');

/**
 * Subscription - Planes de usuario para publicar múltiples tiritos.
 * Flujo mock: simula pago pero no conecta a pasarela real.
 * 
 * Free: 1 tirito activo
 * Pro: 3 tiritos activos  
 * Business: 10 tiritos activos
 */
const PLAN_LIMITS = {
  free: { maxActiveTiritos: 1, featuredListings: 0, analyticsAccess: false, price: 0 },
  pro: { maxActiveTiritos: 3, featuredListings: 1, analyticsAccess: false, price: 3 },
  business: { maxActiveTiritos: 10, featuredListings: 5, analyticsAccess: true, price: 10 }
};

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'business'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending_payment'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['mock', 'pago_movil', 'transferencia', 'zelle', 'binance_pay'],
    default: 'mock'
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  lastPaymentRef: {
    type: String,
    default: null
  }
}, { timestamps: true });

subscriptionSchema.index({ userId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, endDate: 1 });

// Estático para obtener límites del plan
subscriptionSchema.statics.getPlanLimits = function(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
module.exports.PLAN_LIMITS = PLAN_LIMITS;
