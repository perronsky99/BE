const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. 'ban_user','unban_user','report_action'
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  reason: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Audit', auditSchema);
