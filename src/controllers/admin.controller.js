const Audit = require('../models/Audit');

// GET /api/admin/audits
const listAudits = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Permiso denegado' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.actor) query.actor = req.query.actor;
    if (req.query.targetUser) query.targetUser = req.query.targetUser;
    if (req.query.action) query.action = req.query.action;

    const total = await Audit.countDocuments(query);
    const items = await Audit.find(query)
      .populate('actor', 'username email')
      .populate('targetUser', 'username email')
      .populate('report', 'category description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ data: items, total, page, limit });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAudits };
