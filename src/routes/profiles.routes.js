const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/profiles.controller');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

// Middleware de auth opcional: si hay token, lo decodifica; si no, continúa sin user
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.sub);
        if (user) req.user = { id: user._id.toString(), role: user.role };
      }
    }
  } catch (e) {
    // Silenciar — continuar sin auth
  }
  next();
};

// GET /api/profiles/:id - Perfil público (con auth opcional para datos sensibles)
router.get('/:id', optionalAuth, getProfile);

module.exports = router;
