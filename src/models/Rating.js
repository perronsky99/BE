const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  tiritoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tirito',
    required: true
  },
  raterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

ratingSchema.index({ targetId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
