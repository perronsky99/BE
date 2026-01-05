const express = require('express');
const router = express.Router();
const { getMe, updateMe } = require('../controllers/users.controller');
const auth = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/users/me
router.get('/me', getMe);

// PATCH /api/users/me
router.patch('/me', updateMe);

module.exports = router;
