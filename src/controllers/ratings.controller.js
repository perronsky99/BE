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

// GET /api/ratings/pending
const getPendingRatingsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Buscar tiritos cerrados donde el usuario participó (creador o assignedTo)
    const tiritosAsCreator = await Tirito.find({ createdBy: userId, status: 'closed' }).select('_id title assignedTo createdBy createdAt');
    const tiritosAsAssignee = await Tirito.find({ assignedTo: userId, status: 'closed' }).select('_id title createdBy assignedTo createdAt');

    const candidates = [...tiritosAsCreator, ...tiritosAsAssignee];

    const pending = [];

    const User = require('../models/User');

    for (const t of candidates) {
      // determinar target: si yo soy creador, target = assignedTo; si soy assignedTo, target = createdBy
      const isCreator = t.createdBy.toString() === userId.toString();
      const targetId = isCreator ? t.assignedTo : t.createdBy;

      if (!targetId) continue; // no hay contraparte

      // Verificar si ya existe calificación de mi parte hacia target para este tirito
      const exists = await Rating.findOne({ tiritoId: t._id, raterId: userId, targetId });
      if (!exists) {
        // cargar datos del target para mostrar nombre/username
        const targetUser = await User.findById(targetId).select('name username');
        pending.push({
          tiritoId: t._id,
          tiritoTitle: t.title,
          targetId: targetId,
          targetName: targetUser ? (targetUser.username || targetUser.name) : 'Usuario',
          tiritoClosedAt: t.createdAt
        });
      }
    }

    res.json({ data: pending, total: pending.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/ratings/tirito/:tiritoId
// Obtener calificaciones de un tirito específico (dada y recibida para el usuario actual)
const getRatingsForTirito = async (req, res, next) => {
  try {
    const { tiritoId } = req.params;
    const userId = req.user.id;

    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) return res.status(404).json({ message: 'Tirito no encontrado' });

    const User = require('../models/User');

    // Determinar quién es la contraparte
    const isCreator = tirito.createdBy.toString() === userId.toString();
    const isAssignee = tirito.assignedTo && tirito.assignedTo.toString() === userId.toString();
    const counterpartId = isCreator ? tirito.assignedTo : tirito.createdBy;

    let givenRating = null;
    let receivedRating = null;
    let counterpartName = null;

    if (counterpartId) {
      const counterpart = await User.findById(counterpartId).select('name username');
      counterpartName = counterpart ? (counterpart.username || counterpart.name) : 'Usuario';

      // Rating que yo di
      givenRating = await Rating.findOne({ tiritoId, raterId: userId, targetId: counterpartId });
      // Rating que me dieron
      receivedRating = await Rating.findOne({ tiritoId, raterId: counterpartId, targetId: userId });
    }

    res.json({
      tiritoId,
      isParticipant: isCreator || isAssignee,
      isCreator,
      counterpartId,
      counterpartName,
      givenRating: givenRating ? { score: givenRating.score, comment: givenRating.comment, createdAt: givenRating.createdAt } : null,
      receivedRating: receivedRating ? { score: receivedRating.score, comment: receivedRating.comment, createdAt: receivedRating.createdAt } : null
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/ratings/request
// Solicitar valoración a la contraparte de un tirito
const requestRating = async (req, res, next) => {
  try {
    const { tiritoId } = req.body;
    const userId = req.user.id;

    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) return res.status(404).json({ message: 'Tirito no encontrado' });
    if (tirito.status !== 'closed') {
      return res.status(400).json({ message: 'Solo se puede solicitar valoración en tiritos cerrados' });
    }

    const User = require('../models/User');
    const Notification = require('../models/Notification');

    // Determinar contraparte
    const isCreator = tirito.createdBy.toString() === userId.toString();
    const counterpartId = isCreator ? tirito.assignedTo : tirito.createdBy;

    if (!counterpartId) {
      return res.status(400).json({ message: 'No hay contraparte para este tirito' });
    }

    // Verificar si la contraparte ya me calificó
    const alreadyRated = await Rating.findOne({ tiritoId, raterId: counterpartId, targetId: userId });
    if (alreadyRated) {
      return res.status(400).json({ message: 'La contraparte ya te valoró en este tirito' });
    }

    // Obtener nombre del solicitante
    const requester = await User.findById(userId).select('name username');
    const requesterName = requester ? (requester.username || requester.name) : 'Alguien';

    // Crear notificación
    const notification = await Notification.create({
      userId: counterpartId,
      type: 'rating_request',
      title: 'Solicitud de valoración',
      message: `${requesterName} te pide que valores el trabajo en "${tirito.title}"`,
      fromUserId: userId,
      tiritoId: tirito._id,
      actionUrl: `/tiritos/${tirito._id}`
    });

    // Emitir por socket si está disponible
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${counterpartId}`).emit('notification', notification);
    }

    res.json({ message: 'Solicitud de valoración enviada' });
  } catch (err) {
    next(err);
  }
};

// Attach new functions to exports
module.exports.getPendingRatingsForUser = getPendingRatingsForUser;
module.exports.getRatingsForTirito = getRatingsForTirito;
module.exports.requestRating = requestRating;
