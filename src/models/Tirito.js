const mongoose = require('mongoose');

const tiritoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  images: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 5;
      },
      message: 'No podés subir más de 5 imágenes'
    },
    default: []
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'La ubicación no puede exceder 200 caracteres'],
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'closed'],
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  price: {
    type: Number,
    default: null,
    min: 0
  },
  currency: {
    type: String,
    enum: ['VES', 'USD'],
    default: 'USD'
  },
  priceType: {
    type: String,
    enum: ['fixed', 'negotiable', 'free'],
    default: 'free'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

tiritoSchema.index({ createdBy: 1, status: 1 });
tiritoSchema.index({ status: 1, createdAt: -1 });
tiritoSchema.index({ category: 1, status: 1, createdAt: -1 });
tiritoSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Tirito', tiritoSchema);
