const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Obtiene las notificaciones del usuario autenticado
 * Query params: ?unreadOnly=true&limit=20&skip=0
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { unreadOnly, limit = 20, skip = 0 } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('fromUserId', 'name email')
        .populate('tiritoId', 'title')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, read: false })
    ]);

    res.json({
      notifications,
      total,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Obtiene solo el contador de no leídas (para badge)
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marca una notificación como leída
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación marcada como leída', notification });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all
 * Marca todas las notificaciones como leídas
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Elimina una notificación
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación eliminada' });
  } catch (error) {
    next(error);
  }
};

/**
 * Función helper para crear notificaciones (uso interno)
 * @param {Object} data - Datos de la notificación
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    const metrics = require('../utils/metrics');
    const logger = require('../utils/logger');
    metrics.inc('notifications_created', 1);
    // Emitir evento socket a usuario si está conectado
    try {
      const socketUtil = require('../utils/socket');
      const io = socketUtil.getIO();
      if (io && notification && notification.userId) {
        io.to(`user_${notification.userId}`).emit('notification', notification);
        metrics.inc('notifications_emitted', 1);
        logger.info('Notification emitted', { to: `user_${notification.userId}`, id: notification._id });
      }
    } catch (err) {
      metrics.inc('notifications_failed_emits', 1);
      logger.warn('No se pudo emitir socket', { err: err.message || err });
    }
    return notification;
  } catch (error) {
    console.error('Error creando notificación:', error);
    return null;
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  // utilidad para pruebas: crea y emite una notificación a userId
  testNotification: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { title = 'Notificación de prueba', message = 'Este es un mensaje de prueba', type = 'chat_message', actionUrl = '/' } = req.body || {};

      const notification = await createNotification({
        userId,
        type,
        title,
        message,
        fromUserId: req.user ? req.user.id : null,
        actionUrl
      });

      if (!notification) return res.status(500).json({ message: 'No se pudo crear notificación' });

      res.json({ notification });
    } catch (error) {
      next(error);
    }
  }
};

