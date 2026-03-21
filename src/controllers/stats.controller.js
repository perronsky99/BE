const UserStats = require('../models/UserStats');
const Tirito = require('../models/Tirito');
const Rating = require('../models/Rating');
const User = require('../models/User');
const Analytics = require('../models/Analytics');

// GET /api/admin/stats/user/:userId - Stats de un usuario
const getUserStats = async (req, res, next) => {
  try {
    let stats = await UserStats.findOne({ userId: req.params.userId });
    
    if (!stats) {
      stats = await recalculateUserStats(req.params.userId);
    }

    res.json({ stats });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/stats/recalculate/:userId - Recalcular stats de un usuario
const recalculateUserStatsEndpoint = async (req, res, next) => {
  try {
    const stats = await recalculateUserStats(req.params.userId);
    res.json({ message: 'Stats recalculadas', stats });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics - Dashboard de analytics
const getAnalyticsDashboard = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Métricas en tiempo real
    const [
      totalUsers,
      totalTiritos,
      activeTiritos,
      completedTiritos,
      totalRatings,
      avgRating
    ] = await Promise.all([
      User.countDocuments(),
      Tirito.countDocuments(),
      Tirito.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Tirito.countDocuments({ status: 'closed' }),
      Rating.countDocuments(),
      Rating.aggregate([{ $group: { _id: null, avg: { $avg: '$score' } } }])
    ]);

    // Usuarios nuevos en periodo
    const newUsers = await User.countDocuments({ createdAt: { $gte: since } });
    const newTiritos = await Tirito.countDocuments({ createdAt: { $gte: since } });

    // Tiritos por estado
    const tiritosByStatus = await Tirito.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Historico diario guardado
    const dailyMetrics = await Analytics.find({ date: { $gte: since } })
      .sort({ date: 1 })
      .lean();

    res.json({
      overview: {
        totalUsers,
        totalTiritos,
        activeTiritos,
        completedTiritos,
        totalRatings,
        avgRating: avgRating[0]?.avg || 0,
        newUsersInPeriod: newUsers,
        newTiritosInPeriod: newTiritos
      },
      tiritosByStatus: tiritosByStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      dailyMetrics,
      period: { days, since }
    });
  } catch (error) {
    next(error);
  }
};

// Función helper para recalcular stats
async function recalculateUserStats(userId) {
  const [
    tiritosCreated,
    tiritosCompleted,
    tiritosWorked,
    ratings,
    user
  ] = await Promise.all([
    Tirito.countDocuments({ createdBy: userId }),
    Tirito.countDocuments({ createdBy: userId, status: 'closed' }),
    Tirito.countDocuments({ assignedTo: userId, status: 'closed' }),
    Rating.find({ targetId: userId }).lean(),
    User.findById(userId).select('verificationStatus').lean()
  ]);

  const totalCompleted = tiritosCompleted + tiritosWorked;
  const totalCreated = tiritosCreated;
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : 0;

  const completionRate = totalCreated > 0
    ? Math.round((tiritosCompleted / totalCreated) * 100)
    : 0;

  const stats = await UserStats.findOneAndUpdate(
    { userId },
    {
      totalTiritosCreated: tiritosCreated,
      totalTiritosCompleted: tiritosCompleted,
      totalTiritosWorked: tiritosWorked,
      completionRate,
      avgRating: Math.round(avgRating * 100) / 100,
      totalRatings: ratings.length,
      lastCalculatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  // Recalcular nivel
  stats.recalculateLevel(user?.verificationStatus === 'verified');
  await stats.save();

  return stats;
}

module.exports = { getUserStats, recalculateUserStatsEndpoint, getAnalyticsDashboard, recalculateUserStats };
