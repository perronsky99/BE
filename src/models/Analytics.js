const mongoose = require('mongoose');

/**
 * Analytics - Agregación diaria de métricas de negocio
 */
const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  metrics: {
    newUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    tiritosCreated: { type: Number, default: 0 },
    tiritosCompleted: { type: Number, default: 0 },
    requestsSent: { type: Number, default: 0 },
    requestsAccepted: { type: Number, default: 0 },
    messagesExchanged: { type: Number, default: 0 },
    avgCompletionTimeHours: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    disputes: { type: Number, default: 0 }
  }
}, { timestamps: true });

analyticsSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
