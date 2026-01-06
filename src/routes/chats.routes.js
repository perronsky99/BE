const express = require('express');
const router = express.Router();
const { getChat, sendMessage, getMyChats } = require('../controllers/chats.controller');
const auth = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

const messageLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 60, // limit to 60 messages per window per IP
	standardHeaders: true,
	legacyHeaders: false
});

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/chats - Mis chats
router.get('/', getMyChats);

// GET /api/chats/:tiritoId - Obtener chat de un tirito
router.get('/:tiritoId', getChat);

// POST /api/chats/:tiritoId/message - Enviar mensaje
router.post('/:tiritoId/message', messageLimiter, sendMessage);

module.exports = router;
