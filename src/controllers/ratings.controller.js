const Rating = require('../models/Rating');
const Tirito = require('../models/Tirito');

// POST /api/ratings
const createRating = async (req, res, next) => {
  try {
    const { tiritoId, targetId, score, comment } = req.body;
    const raterId = req.user.id;

    if (!tiritoId || !targetId || !score) {
      return res.status(400).json({ message: 'tiritoId, targetId y score son requeridos' });
    }

    // Validar que el tirito exista y esté cerrado
    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) return res.status(404).json({ message: 'Tirito no encontrado' });
    if (tirito.status !== 'closed') {
      return res.status(400).json({ message: 'Sólo se pueden calificar tiritos cerrados' });
    }

    // Evitar autocalificación
    if (raterId === targetId) return res.status(400).json({ message: 'No podés calificarte a vos mismo' });

    // Evitar duplicados por mismo tirito y rater
    const exists = await Rating.findOne({ tiritoId, raterId, targetId });
    if (exists) return res.status(400).json({ message: 'Ya calificaste este tirito para este usuario' });

    const rating = await Rating.create({ tiritoId, raterId, targetId, score, comment });

    res.status(201).json({ message: 'Calificación creada', rating });
  } catch (err) {
    next(err);
  }
};

// GET /api/ratings/user/:userId
const getRatingsForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const ratings = await Rating.find({ targetId: userId }).sort({ createdAt: -1 }).limit(100);
    res.json({ data: ratings });
  } catch (err) {
    next(err);
  }
};

// GET /api/ratings/summary/:userId
const getRatingsSummary = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const agg = await Rating.aggregate([
      { $match: { targetId: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$targetId', avgScore: { $avg: '$score' }, count: { $sum: 1 } } }
    ]);
    const summary = agg[0] || { avgScore: 0, count: 0 };
    res.json({ avgScore: summary.avgScore || 0, count: summary.count || 0 });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRating,
  getRatingsForUser,
  getRatingsSummary
};
