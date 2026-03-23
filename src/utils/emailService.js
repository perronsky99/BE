/**
 * Servicio centralizado de emails transaccionales.
 *
 * Todas las funciones son fire-and-forget: no bloquean la respuesta HTTP.
 * Errores se loguean pero nunca rompen el flujo principal.
 *
 * Protecciones de producción:
 * - Idempotencia básica por dedupKey (in-memory, TTL 60s)
 * - Throttling por tag+email (ventana 10s)
 * - Validación de destinatario antes de enviar
 */
const mailer = require('./mailer');
const logger = require('./logger');

// ─── INFRAESTRUCTURA ────────────────────────────────────────────────

const FRONTEND_URL = () => {
  const raw = process.env.FRONTEND_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : 'http://localhost:4200';
};

/** Extrae firstName del usuario de forma segura */
const getName = (user) => user?.firstName || user?.name || '';

/** Extrae email del usuario de forma segura */
const getEmail = (user) => user?.email || null;

// Idempotencia: evita duplicados del mismo evento (TTL 60s)
const _dedupSet = new Set();
const DEDUP_TTL_MS = 60_000;

// Throttle: evita spam accidental por tag+email (ventana 10s)
const _throttleMap = new Map();
const THROTTLE_WINDOW_MS = 10_000;

// Limpieza periódica del throttle map (cada 5 min, no bloquea shutdown)
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of _throttleMap) {
    if (now - ts > THROTTLE_WINDOW_MS * 2) _throttleMap.delete(key);
  }
}, 300_000).unref();

/**
 * Envía un email de forma segura (fire-and-forget).
 * Nunca lanza excepciones.
 * @param {string} tag - Identificador del tipo de email
 * @param {object} params - Parámetros para mailer.sendMail
 * @param {string} [dedupKey] - Clave opcional de idempotencia
 */
const safeSend = async (tag, params, dedupKey) => {
  try {
    if (!params?.to) {
      logger.warn(`[email:${tag}] Omitido: destinatario ausente`);
      return;
    }

    // Idempotencia: si ya se envió este evento exacto, omitir
    if (dedupKey) {
      if (_dedupSet.has(dedupKey)) {
        logger.info(`[email:${tag}] Duplicado omitido`);
        return;
      }
      _dedupSet.add(dedupKey);
      setTimeout(() => _dedupSet.delete(dedupKey), DEDUP_TTL_MS);
    }

    // Throttle: no enviar el mismo tag al mismo destino en < 10s
    const throttleKey = `${tag}:${params.to}`;
    const lastSent = _throttleMap.get(throttleKey);
    if (lastSent && Date.now() - lastSent < THROTTLE_WINDOW_MS) {
      logger.info(`[email:${tag}] Throttled para ${params.to}`);
      return;
    }
    _throttleMap.set(throttleKey, Date.now());

    await mailer.sendMail(params);
    logger.info(`[email:${tag}] Enviado a ${params.to}`);
  } catch (e) {
    logger.error(`[email:${tag}] Error enviando a ${params?.to || 'desconocido'}: ${e?.message || e}`);
  }
};

// ─── 1. REGISTRO (WELCOME) ──────────────────────────────────────────
// Ya implementado en auth.controller.js — se mantiene ahí.

// ─── 2. TIRITO CREADO ───────────────────────────────────────────────
const sendTiritoCreated = (user, tirito) => {
  const to = getEmail(user);
  if (!to) return;
  safeSend('tirito-created', {
    to,
    subject: `Tu tirito "${tirito.title}" fue creado`,
    template: 'tirito-created',
    templateData: {
      firstName: getName(user),
      tiritoTitle: tirito.title,
      tiritoDescription: (tirito.description || '').substring(0, 200),
      tiritoLocation: tirito.location || null,
      tiritoPrice: tirito.price || null,
      tiritoCurrency: tirito.currency || 'USD',
      tiritoUrl: `${FRONTEND_URL()}/tiritos/${tirito._id}`
    },
    text: `Tu tirito "${tirito.title}" fue creado exitosamente. Velo en ${FRONTEND_URL()}/tiritos/${tirito._id}`
  }, `tirito-created:${tirito._id}`);
};

// ─── 3. TIRITO CAMBIO DE ESTADO ─────────────────────────────────────
const STATUS_LABELS = { open: 'Abierto', in_progress: 'En progreso', closed: 'Cerrado' };
const STATUS_MESSAGES = {
  in_progress: 'Alguien fue asignado a tu tirito. Ya pueden comunicarse por chat.',
  closed: 'Tu tirito fue completado. No olvides calificar al participante.'
};

const sendTiritoStatusChanged = (user, tirito, newStatus, assignedToName) => {
  const to = getEmail(user);
  if (!to) return;
  safeSend('tirito-status', {
    to,
    subject: `Tu tirito "${tirito.title}" cambió a ${STATUS_LABELS[newStatus] || newStatus}`,
    template: 'tirito-status-changed',
    templateData: {
      firstName: getName(user),
      tiritoTitle: tirito.title,
      newStatus,
      statusLabel: STATUS_LABELS[newStatus] || newStatus,
      statusMessage: STATUS_MESSAGES[newStatus] || '',
      assignedToName: assignedToName || null,
      tiritoUrl: `${FRONTEND_URL()}/tiritos/${tirito._id}`
    },
    text: `Tu tirito "${tirito.title}" cambió a ${STATUS_LABELS[newStatus] || newStatus}.`
  }, `tirito-status:${tirito._id}:${newStatus}`);
};

// ─── 4. ALGUIEN INTERESADO (NUEVA SOLICITUD) ────────────────────────
const sendTiritoRequestNew = (creatorUser, requesterName, tirito, message) => {
  const to = getEmail(creatorUser);
  if (!to) return;
  safeSend('request-new', {
    to,
    subject: `${requesterName} quiere hacer tu tirito "${tirito.title}"`,
    template: 'tirito-request-new',
    templateData: {
      firstName: getName(creatorUser),
      requesterName,
      tiritoTitle: tirito.title,
      requesterMessage: message || null,
      requestsUrl: `${FRONTEND_URL()}/solicitudes`
    },
    text: `${requesterName} quiere hacer tu tirito "${tirito.title}". Revisá tus solicitudes.`
  });
};

// ─── 5. SOLICITUD ACEPTADA / RECHAZADA ──────────────────────────────
const sendRequestResult = (requesterUser, tiritoTitle, tiritoId, accepted) => {
  const to = getEmail(requesterUser);
  if (!to) return;
  const label = accepted ? 'aceptada' : 'rechazada';
  safeSend('request-result', {
    to,
    subject: `Tu solicitud para "${tiritoTitle}" fue ${label}`,
    template: 'tirito-request-result',
    templateData: {
      firstName: getName(requesterUser),
      tiritoTitle,
      accepted,
      actionUrl: accepted ? `${FRONTEND_URL()}/tiritos/${tiritoId}` : `${FRONTEND_URL()}/tiritos`,
      buttonText: accepted ? 'Ir al tirito' : 'Buscar tiritos'
    },
    text: `Tu solicitud para "${tiritoTitle}" fue ${label}.`
  }, `request-result:${tiritoId}:${to}:${accepted}`);
};

// ─── 6. CALIFICACIÓN RECIBIDA ───────────────────────────────────────
const sendRatingReceived = (targetUser, raterName, tirito, score, comment) => {
  const to = getEmail(targetUser);
  if (!to) return;
  const stars = '★'.repeat(score) + '☆'.repeat(5 - score);
  safeSend('rating-received', {
    to,
    subject: `${raterName} te calificó con ${score} estrellas`,
    template: 'rating-received',
    templateData: {
      firstName: getName(targetUser),
      raterName,
      tiritoTitle: tirito.title || tirito,
      score,
      starsDisplay: stars,
      comment: comment || null,
      profileUrl: `${FRONTEND_URL()}/perfil/${targetUser._id || targetUser.id}`
    },
    text: `${raterName} te calificó con ${score}/5 estrellas por "${tirito.title || tirito}".`
  });
};

// ─── 7. USUARIO BANEADO ─────────────────────────────────────────────
const sendUserBanned = (user, reason, durationDays) => {
  const to = getEmail(user);
  if (!to) return;
  const duration = durationDays ? `${durationDays} día(s)` : null;
  safeSend('user-banned', {
    to,
    subject: 'Tu cuenta en Tirito fue suspendida',
    template: 'user-banned',
    templateData: {
      firstName: getName(user),
      actionLabel: 'suspendida',
      reason: reason || 'Violación de términos de uso',
      duration,
      date: new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
    },
    text: `Tu cuenta en Tirito fue suspendida. Motivo: ${reason || 'Violación de términos de uso'}.`
  });
};

// ─── 8. DATOS PERSONALES MODIFICADOS ────────────────────────────────
const sendProfileUpdated = (user, changedFields) => {
  const to = getEmail(user);
  if (!to) return;
  const fields = Array.isArray(changedFields) ? changedFields.join(', ') : changedFields;
  safeSend('profile-updated', {
    to,
    subject: 'Tus datos personales fueron actualizados',
    template: 'profile-updated',
    templateData: {
      firstName: getName(user),
      changedFields: fields,
      profileUrl: `${FRONTEND_URL()}/perfil/${user._id || user.id}`
    },
    text: `Tus datos personales fueron actualizados (${fields}). Si no fuiste vos, cambiá tu contraseña.`
  });
};

// ─── 9. CONTRASEÑA CAMBIADA ─────────────────────────────────────────
const sendPasswordChanged = (user) => {
  const to = getEmail(user);
  if (!to) return;
  safeSend('password-changed', {
    to,
    subject: 'Tu contraseña fue cambiada',
    template: 'password-changed',
    templateData: {
      firstName: getName(user)
    },
    text: 'Tu contraseña fue cambiada exitosamente. Si no fuiste vos, contactá soporte.'
  });
};

// ─── 10. VERIFICACIÓN KYC RESULTADO ────────────────────────────────
const sendVerificationResult = (user, approved, rejectionReason) => {
  const to = getEmail(user);
  if (!to) return;
  const label = approved ? 'aprobada' : 'rechazada';
  safeSend('verification-result', {
    to,
    subject: `Tu verificación fue ${label}`,
    template: 'verification-result',
    templateData: {
      firstName: getName(user),
      approved,
      rejectionReason: rejectionReason || null,
      profileUrl: `${FRONTEND_URL()}/perfil/verificacion`
    },
    text: `Tu verificación fue ${label}.${rejectionReason ? ' Motivo: ' + rejectionReason : ''}`
  });
};

// ─── 11. NUEVO MENSAJE DE CHAT ──────────────────────────────────────
const sendChatMessage = (recipientUser, senderName, tirito, messagePreview, isNewChat) => {
  const to = getEmail(recipientUser);
  if (!to) return;
  const subject = isNewChat
    ? `${senderName} te contactó por tu tirito "${tirito.title}"`
    : `Nuevo mensaje de ${senderName} en "${tirito.title}"`;
  safeSend('chat-message', {
    to,
    subject,
    template: 'chat-message',
    templateData: {
      firstName: getName(recipientUser),
      senderName,
      tiritoTitle: tirito.title,
      messagePreview: (messagePreview || '').substring(0, 200),
      isNewChat: !!isNewChat,
      chatUrl: `${FRONTEND_URL()}/chat/${tirito._id}`
    },
    text: `${senderName} te envió un mensaje en "${tirito.title}": ${(messagePreview || '').substring(0, 200)}`
  }, `chat-msg:${recipientUser._id || recipientUser.id}:${tirito._id}:${Date.now()}`);
};

// ─── 12. DIGEST (NOTIFICACIONES + CHATS SIN RESPONDER) ─────────────
const sendDigest = (user, { unreadNotifications, notificationSamples, unansweredChats, chatSamples }) => {
  const to = getEmail(user);
  if (!to) return;
  const pending = (unreadNotifications || 0) + (unansweredChats || 0);
  safeSend('digest', {
    to,
    subject: `Tenés ${pending} cosas pendientes en Tirito`,
    template: 'digest',
    templateData: {
      firstName: getName(user),
      unreadNotifications: unreadNotifications || 0,
      notificationSamples: notificationSamples || [],
      unansweredChats: unansweredChats || 0,
      chatSamples: chatSamples || [],
      frontendUrl: FRONTEND_URL()
    },
    text: `Tenés ${unreadNotifications || 0} notificaciones sin leer y ${unansweredChats || 0} chats sin responder.`
  });
};

module.exports = {
  sendTiritoCreated,
  sendTiritoStatusChanged,
  sendTiritoRequestNew,
  sendRequestResult,
  sendRatingReceived,
  sendUserBanned,
  sendProfileUpdated,
  sendPasswordChanged,
  sendVerificationResult,
  sendChatMessage,
  sendDigest
};
