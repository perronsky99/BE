const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');
const { listAudits } = require('../controllers/admin.controller');
const { getUserStats, recalculateUserStatsEndpoint, getAnalyticsDashboard } = require('../controllers/stats.controller');

// Admin audits
router.get('/audits', auth, isAdmin, listAudits);

// Admin stats & analytics
router.get('/analytics', auth, isAdmin, getAnalyticsDashboard);
router.get('/stats/user/:userId', auth, isAdmin, getUserStats);
router.post('/stats/recalculate/:userId', auth, isAdmin, recalculateUserStatsEndpoint);

module.exports = router;
