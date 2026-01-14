const express = require('express');
const router = express.Router();
const { getMe, updateMe } = require('../controllers/users.controller');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/users.controller');
const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');
const { listBannedUsers, adminBanUser, adminUnbanUser } = require('../controllers/users.controller');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/users/me
router.get('/me', getMe);

// PATCH /api/users/me
router.patch('/me', updateMe);

// Favorites
router.get('/me/favorites', getFavorites);
router.post('/me/favorites/:tiritoId', addFavorite);
router.delete('/me/favorites/:tiritoId', removeFavorite);

// Admin routes for ban management
router.get('/admin/bans', isAdmin, listBannedUsers);
router.post('/admin/ban/:userId', isAdmin, adminBanUser);
router.post('/admin/unban/:userId', isAdmin, adminUnbanUser);

module.exports = router;
