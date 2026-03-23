/**
 * Cron: Digest diario de notificaciones no leídas y chats sin responder.
 *
 * Se ejecuta una vez al día a las 13:00 UTC (09:00 VET).
 * Para cada usuario con pendientes, envía un único email-resumen.
 * Throttle: sólo envía si el último digest fue hace > 23 h.
 */
const cron = require('node-cron');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

const DIGEST_INTERVAL_MS = 23 * 60 * 60 * 1000; // 23 h

/**
 * Construir y enviar digests.
 */
const runDigest = async () => {
  logger.info('[digest-cron] Iniciando ciclo de digest...');

  try {
    /* 1. Usuarios con notificaciones no leídas */
    const unreadAgg = await Notification.aggregate([
      { $match: { read: false } },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          samples: { $push: { title: '$title', message: '$message' } }
        }
      }
    ]);

    // Map userId → { count, samples }
    const unreadMap = new Map();
    for (const row of unreadAgg) {
      unreadMap.set(String(row._id), {
        count: row.count,
        samples: row.samples.slice(0, 3) // máx 3 muestras
      });
    }

    /* 2. Chats con mensajes sin responder (último mensaje NO es del usuario) */
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Último mensaje de cada chat
    const lastMessages = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$chatId',
          lastSender: { $first: '$sender' },
          lastContent: { $first: '$content' },
          lastAt: { $first: '$createdAt' }
        }
      },
      { $match: { lastAt: { $gte: oneDayAgo } } }
    ]);

    // Para cada chat, determinar quién NO respondió
    const chatIds = lastMessages.map((m) => m._id);
    const chats = await Chat.find({ _id: { $in: chatIds } }).lean();
    const chatMap = new Map(chats.map((c) => [String(c._id), c]));

    // unansweredByUser: userId → [{ chatId, senderName, content }]
    const unansweredByUser = new Map();

    for (const lm of lastMessages) {
      const chat = chatMap.get(String(lm._id));
      if (!chat || !chat.participants) continue;

      // Participante que NO envió el último mensaje
      for (const p of chat.participants) {
        if (String(p) !== String(lm.lastSender)) {
          const key = String(p);
          if (!unansweredByUser.has(key)) unansweredByUser.set(key, []);
          unansweredByUser.get(key).push({
            chatId: lm._id,
            senderName: null, // se resolverá abajo
            senderId: lm.lastSender,
            content: (lm.lastContent || '').substring(0, 80)
          });
        }
      }
    }

    /* 3. Set de usuarios que necesitan digest */
    const userIds = new Set([...unreadMap.keys(), ...unansweredByUser.keys()]);

    if (userIds.size === 0) {
      logger.info('[digest-cron] Sin usuarios con pendientes. Saltando.');
      return;
    }

    // Cargar usuarios
    const users = await User.find({
      _id: { $in: [...userIds] },
      banned: { $ne: true }
    })
      .select('_id email name firstName lastDigestAt')
      .lean();

    // Cargar nombres de senders de chat
    const senderIds = new Set();
    for (const items of unansweredByUser.values()) {
      for (const it of items) senderIds.add(String(it.senderId));
    }
    const senders = await User.find({ _id: { $in: [...senderIds] } })
      .select('_id name firstName')
      .lean();
    const senderNameMap = new Map(
      senders.map((s) => [String(s._id), s.firstName || s.name || 'Alguien'])
    );

    // Rellenar senderName en unanswered
    for (const items of unansweredByUser.values()) {
      for (const it of items) {
        it.senderName = senderNameMap.get(String(it.senderId)) || 'Alguien';
      }
    }

    /* 4. Enviar emails */
    let sent = 0;

    for (const user of users) {
      const uid = String(user._id);

      // Throttle: no enviar si ya se envió un digest recientemente
      if (user.lastDigestAt && Date.now() - new Date(user.lastDigestAt).getTime() < DIGEST_INTERVAL_MS) {
        continue;
      }

      const unread = unreadMap.get(uid) || { count: 0, samples: [] };
      const unanswered = unansweredByUser.get(uid) || [];

      // Si no hay nada, skip
      if (unread.count === 0 && unanswered.length === 0) continue;

      emailService.sendDigest(user, {
        unreadNotifications: unread.count,
        notificationSamples: unread.samples,
        unansweredChats: unanswered.length,
        chatSamples: unanswered.slice(0, 3)
      });

      // Actualizar lastDigestAt (fire-and-forget)
      User.updateOne({ _id: user._id }, { $set: { lastDigestAt: new Date() } }).catch(() => {});

      sent++;
    }

    logger.info(`[digest-cron] Ciclo completado. ${sent} digests enviados.`);
  } catch (error) {
    logger.error(`[digest-cron] Error: ${error.message}`, { stack: error.stack });
  }
};

/**
 * Iniciar el cron: todos los días a las 13:00 UTC (09:00 VET).
 */
const startDigestCron = () => {
  cron.schedule('0 13 * * *', runDigest, { timezone: 'UTC' });
  logger.info('[digest-cron] Programado: diario a 13:00 UTC (09:00 VET)');
};

module.exports = { startDigestCron, runDigest };
