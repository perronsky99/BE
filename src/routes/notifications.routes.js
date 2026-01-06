const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
  ,testNotification
} = require('../controllers/notifications.controller');
const auth = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/notifications - Obtener notificaciones
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Contador de no leídas
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/read-all - Marcar todas como leídas
router.put('/read-all', markAllAsRead);

// PUT /api/notifications/:id/read - Marcar una como leída
router.put('/:id/read', markAsRead);

// DELETE /api/notifications/:id - Eliminar notificación
router.delete('/:id', deleteNotification);

// POST /api/notifications/test/:userId - Crear notificación de prueba (autenticado)
router.post('/test/:userId', testNotification);

module.exports = router;
