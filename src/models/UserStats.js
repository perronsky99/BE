const mongoose = require('mongoose');

/**
 * UserStats - Estadísticas materializadas para rendimiento
 * Recalcular con cron o triggers post-rating/post-tirito
 */
const LEVELS = {
  nuevo: { minCompleted: 0, minRating: 0 },
  activo: { minCompleted: 1, minRating: 0 },
  confiable: { minCompleted: 5, minRating: 4.0 },
  experto: { minCompleted: 20, minRating: 4.5 },
  leyenda: { minCompleted: 50, minRating: 4.8 }
};

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalTiritosCreated: { type: Number, default: 0 },
  totalTiritosCompleted: { type: Number, default: 0 },
  totalTiritosWorked: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  responseTimeMinutes: { type: Number, default: 0 },
  level: {
    type: String,
    enum: ['nuevo', 'activo', 'confiable', 'experto', 'leyenda'],
    default: 'nuevo'
  },
  badges: {
    type: [String],
    default: []
  },
  lastCalculatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

userStatsSchema.index({ userId: 1 }, { unique: true });
userStatsSchema.index({ level: 1, avgRating: -1 });

// Método para recalcular nivel
userStatsSchema.methods.recalculateLevel = function(isVerified) {
  if (this.totalTiritosCompleted + this.totalTiritosWorked >= 50 && this.avgRating >= 4.8) {
    this.level = 'leyenda';
  } else if (this.totalTiritosCompleted + this.totalTiritosWorked >= 20 && this.avgRating >= 4.5 && isVerified) {
    this.level = 'experto';
  } else if (this.totalTiritosCompleted + this.totalTiritosWorked >= 5 && this.avgRating >= 4.0 && isVerified) {
    this.level = 'confiable';
  } else if (this.totalTiritosCompleted + this.totalTiritosWorked >= 1) {
    this.level = 'activo';
  } else {
    this.level = 'nuevo';
  }
};

module.exports = mongoose.model('UserStats', userStatsSchema);
module.exports.LEVELS = LEVELS;
