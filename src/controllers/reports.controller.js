const Report = require('../models/Report');
const User = require('../models/User');
const Audit = require('../models/Audit');

// POST /api/reports
const createReport = async (req, res, next) => {
  try {
    const { targetId, category, description, evidence } = req.body;
    if (!targetId || !category) return res.status(400).json({ message: 'targetId y category son requeridos' });

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'Usuario objetivo no encontrado' });

    const report = await Report.create({
      reporter: req.user.id,
      target: targetId,
      category,
      description: description || null,
      evidence: Array.isArray(evidence) ? evidence : []
    });

    // Optionally notify admins (placeholder)
    console.log('Nuevo reporte creado', report._id, 'de', req.user.id, 'a', targetId);

    res.status(201).json({ message: 'Reporte creado', reportId: report._id });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports (admin)
const listReports = async (req, res, next) => {
  try {
    // Only admins can list all reports
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Permiso denegado' });
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const query = {};
    const total = await Report.countDocuments(query);
    const items = await Report.find(query)
      .populate('reporter', 'username email')
      .populate('target', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ data: items, total, page, limit });
  } catch (err) {
    next(err);
  }
};

// PUT /api/reports/:id/close
const closeReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Only admins can close/manage reports
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Permiso denegado' });
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Reporte no encontrado' });

    report.status = 'closed';
    report.handledBy = req.user.id;
    report.closedAt = new Date();
    await report.save();

    res.json({ message: 'Reporte cerrado' });
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/:id/action
// body: { action: 'ban'|'unban'|'suspend'|'user_block'|'user_unblock', reason, durationDays }
const handleReportAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason, durationDays } = req.body;
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Reporte no encontrado' });

    const target = await User.findById(report.target);
    if (!target) return res.status(404).json({ message: 'Usuario objetivo no encontrado' });

    // Admin actions: ban / unban / suspend
    const adminActions = ['ban', 'unban', 'suspend'];
    if (adminActions.includes(action)) {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Permiso denegado' });
    }
    if (action === 'ban' || action === 'suspend') {
      target.isBanned = true;
      target.banReason = reason || report.category || 'administrative_action';
      target.bannedAt = new Date();
      target.bannedBy = req.user.id;
      if (durationDays && Number(durationDays) > 0) {
        const expires = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);
        target.banExpires = expires;
      } else {
        target.banExpires = null;
      }
      await target.save();
      // create audit log
      await Audit.create({
        actor: req.user.id,
        action: action === 'ban' ? 'ban_user' : 'suspend_user',
        targetUser: target._id,
        report: report._id,
        reason: target.banReason,
        meta: { durationDays: durationDays || null }
      });
      report.status = 'reviewed';
      report.handledBy = req.user.id;
      await report.save();
      return res.json({ message: 'Usuario baneado/suspendido', userId: target._id });
    }

    if (action === 'unban') {
      target.isBanned = false;
      target.banReason = null;
      target.bannedAt = null;
      target.banExpires = null;
      target.bannedBy = null;
      await target.save();
      report.status = 'closed';
      report.handledBy = req.user.id;
      report.closedAt = new Date();
      await report.save();
      await Audit.create({
        actor: req.user.id,
        action: 'unban_user',
        targetUser: target._id,
        report: report._id,
        reason: reason || report.category
      });
      
      return res.json({ message: 'Usuario desbaneado', userId: target._id });
    }

    // User-level block: reporter wants to block the target (adds to their blockedUsers)
    if (action === 'user_block') {
      const reporter = await User.findById(req.user.id);
      if (!reporter) return res.status(404).json({ message: 'Usuario reportador no encontrado' });
      if (!reporter.blockedUsers) reporter.blockedUsers = [];
      if (!reporter.blockedUsers.find(u => u.toString() === target._id.toString())) {
        reporter.blockedUsers.push(target._id);
        await reporter.save();
        // audit user-level block
        await Audit.create({
          actor: req.user.id,
          action: 'user_block',
          targetUser: target._id,
          report: report._id,
          reason: reason || report.category
        });
      }
      return res.json({ message: 'Usuario bloqueado por reportador', userId: target._id });
    }

    if (action === 'user_unblock') {
      const reporter = await User.findById(req.user.id);
      if (!reporter) return res.status(404).json({ message: 'Usuario reportador no encontrado' });
      reporter.blockedUsers = (reporter.blockedUsers || []).filter(u => u.toString() !== target._id.toString());
      await reporter.save();
      await Audit.create({
        actor: req.user.id,
        action: 'user_unblock',
        targetUser: target._id,
        report: report._id
      });
      return res.json({ message: 'Usuario desbloqueado por reportador', userId: target._id });
    }

    res.status(400).json({ message: 'Acción no reconocida' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReport,
  listReports,
  closeReport,
  handleReportAction
};
