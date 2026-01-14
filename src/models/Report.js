const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { 
    type: String, 
    required: true,
    enum: [
      'inappropriate_behavior',
      'suspected_fraud',
      'vulgar_language',
      'harassment',
      'spam',
      'impersonation',
      'other'
    ]
  },
  description: { type: String, default: null },
  evidence: [{ type: String }], // URLs to evidence (uploads)
  status: { type: String, enum: ['open', 'reviewed', 'closed'], default: 'open' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Report', reportSchema);
