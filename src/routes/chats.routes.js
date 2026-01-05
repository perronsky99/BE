const express = require('express');
const router = express.Router();
const { getChat, sendMessage, getMyChats } = require('../controllers/chats.controller');
const auth = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/chats - Mis chats
router.get('/', getMyChats);

// GET /api/chats/:tiritoId - Obtener chat de un tirito
router.get('/:tiritoId', getChat);

// POST /api/chats/:tiritoId/message - Enviar mensaje
router.post('/:tiritoId/message', sendMessage);

module.exports = router;
