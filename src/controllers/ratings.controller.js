const Rating = require('../models/Rating');
const Tirito = require('../models/Tirito');
const mongoose = require('mongoose');

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
    if (raterId.toString() === targetId.toString()) {
      return res.status(400).json({ message: 'No podés calificarte a vos mismo' });
    }

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
    
    // Usar find + JS para evitar problemas con ObjectId en aggregate
    const ratings = await Rating.find({ targetId: userId });
    
    if (ratings.length === 0) {
      return res.json({ avgScore: 0, count: 0 });
    }
    
    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const avgScore = totalScore / ratings.length;
    
    res.json({ avgScore: Math.round(avgScore * 10) / 10, count: ratings.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRating,
  getRatingsForUser,
  getRatingsSummary
};
