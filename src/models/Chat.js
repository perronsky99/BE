const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  tiritoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tirito',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index para buscar chats por tirito
chatSchema.index({ tiritoId: 1 });

module.exports = mongoose.model('Chat', chatSchema);
