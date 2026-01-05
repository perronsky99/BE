const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'El mensaje no puede estar vacío'],
    trim: true,
    maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index para buscar mensajes por chat
messageSchema.index({ chatId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
