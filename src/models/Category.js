const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la categoría es requerido'],
    trim: true,
    maxlength: 60
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  icon: {
    type: String,
    default: 'category'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

categorySchema.index({ parent: 1, order: 1 });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);
