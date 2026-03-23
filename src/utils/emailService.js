/**
 * Servicio centralizado de emails transaccionales.
 *
 * Todas las funciones son fire-and-forget: no bloquean la respuesta HTTP.
 * Errores se loguean pero nunca rompen el flujo principal.
 */
const mailer = require('./mailer');
const logger = require('./logger');

const FRONTEND_URL = () =>
  (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim().replace(/\/$/, '')) ||
  'http://localhost:4200';

/**
 * Envía un email de forma segura (fire-and-forget).
 * Nunca lanza excepciones.
 */
const safeSend = async (tag, params) => {
  try {
    await mailer.sendMail(params);
    logger.info(`[email:${tag}] Enviado a ${params.to}`);
  } catch (e) {
    logger.error(`[email:${tag}] Error enviando a ${params.to}: ${e?.message || e}`);
  }
};

// ─── 1. REGISTRO (WELCOME) ──────────────────────────────────────────
// Ya implementado en auth.controller.js — se mantiene ahí.

// ─── 2. TIRITO CREADO ───────────────────────────────────────────────
const sendTiritoCreated = (user, tirito) => {
  safeSend('tirito-created', {
    to: user.email,
    subject: `Tu tirito "${tirito.title}" fue creado`,
    template: 'tirito-created',
    templateData: {
      firstName: user.firstName || user.name || '',
      tiritoTitle: tirito.title,
      tiritoDescription: (tirito.description || '').substring(0, 200),
      tiritoLocation: tirito.location || null,
      tiritoPrice: tirito.price || null,
      tiritoCurrency: tirito.currency || 'USD',
      tiritoUrl: `${FRONTEND_URL()}/tiritos/${tirito._id}`
    },
    text: `Tu tirito "${tirito.title}" fue creado exitosamente. Velo en ${FRONTEND_URL()}/tiritos/${tirito._id}`
  });
};

// ─── 3. TIRITO CAMBIO DE ESTADO ─────────────────────────────────────
const STATUS_LABELS = { open: 'Abierto', in_progress: 'En progreso', closed: 'Cerrado' };
const STATUS_MESSAGES = {
  in_progress: 'Alguien fue asignado a tu tirito. Ya pueden comunicarse por chat.',
  closed: 'Tu tirito fue completado. No olvides calificar al participante.'
};

const sendTiritoStatusChanged = (user, tirito, newStatus, assignedToName) => {
  safeSend('tirito-status', {
    to: user.email,
    subject: `Tu tirito "${tirito.title}" cambio a ${STATUS_LABELS[newStatus] || newStatus}`,
    template: 'tirito-status-changed',
    templateData: {
      firstName: user.firstName || user.name || '',
      tiritoTitle: tirito.title,
      newStatus,
      statusLabel: STATUS_LABELS[newStatus] || newStatus,
      statusMessage: STATUS_MESSAGES[newStatus] || '',
      assignedToName: assignedToName || null,
      tiritoUrl: `${FRONTEND_URL()}/tiritos/${tirito._id}`
    },
    text: `Tu tirito "${tirito.title}" cambio a ${STATUS_LABELS[newStatus] || newStatus}.`
  });
};

// ─── 4. ALGUIEN INTERESADO (NUEVA SOLICITUD) ────────────────────────
const sendTiritoRequestNew = (creatorUser, requesterName, tirito, message) => {
  safeSend('request-new', {
    to: creatorUser.email,
    subject: `${requesterName} quiere hacer tu tirito "${tirito.title}"`,
    template: 'tirito-request-new',
    templateData: {
      firstName: creatorUser.firstName || creatorUser.name || '',
      requesterName,
      tiritoTitle: tirito.title,
      requesterMessage: message || null,
      requestsUrl: `${FRONTEND_URL()}/solicitudes`
    },
    text: `${requesterName} quiere hacer tu tirito "${tirito.title}". Revisa tus solicitudes.`
  });
};

// ─── 5. SOLICITUD ACEPTADA / RECHAZADA ──────────────────────────────
const sendRequestResult = (requesterUser, tiritoTitle, tiritoId, accepted) => {
  const label = accepted ? 'aceptada' : 'rechazada';
  safeSend('request-result', {
    to: requesterUser.email,
    subject: `Tu solicitud para "${tiritoTitle}" fue ${label}`,
    template: 'tirito-request-result',
    templateData: {
      firstName: requesterUser.firstName || requesterUser.name || '',
      tiritoTitle,
      accepted,
      actionUrl: accepted ? `${FRONTEND_URL()}/tiritos/${tiritoId}` : `${FRONTEND_URL()}/tiritos`,
      buttonText: accepted ? 'Ir al tirito' : 'Buscar tiritos'
    },
    text: `Tu solicitud para "${tiritoTitle}" fue ${label}.`
  });
};

// ─── 6. CALIFICACION RECIBIDA ───────────────────────────────────────
const sendRatingReceived = (targetUser, raterName, tirito, score, comment) => {
  const stars = '★'.repeat(score) + '☆'.repeat(5 - score);
  safeSend('rating-received', {
    to: targetUser.email,
    subject: `${raterName} te califico con ${score} estrellas`,
    template: 'rating-received',
    templateData: {
      firstName: targetUser.firstName || targetUser.name || '',
      raterName,
      tiritoTitle: tirito.title || tirito,
      score,
      starsDisplay: stars,
      comment: comment || null,
      profileUrl: `${FRONTEND_URL()}/perfil/${targetUser._id || targetUser.id}`
    },
    text: `${raterName} te califico con ${score}/5 estrellas por "${tirito.title || tirito}".`
  });
};

// ─── 7. USUARIO BANEADO ─────────────────────────────────────────────
const sendUserBanned = (user, reason, durationDays) => {
  const duration = durationDays ? `${durationDays} dia(s)` : null;
  safeSend('user-banned', {
    to: user.email,
    subject: 'Tu cuenta en Tirito fue suspendida',
    template: 'user-banned',
    templateData: {
      firstName: user.firstName || user.name || '',
      actionLabel: 'suspendida',
      reason: reason || 'Violacion de terminos de uso',
      duration,
      date: new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
    },
    text: `Tu cuenta en Tirito fue suspendida. Motivo: ${reason || 'Violacion de terminos de uso'}.`
  });
};

// ─── 8. DATOS PERSONALES MODIFICADOS ────────────────────────────────
const sendProfileUpdated = (user, changedFields) => {
  const fields = Array.isArray(changedFields) ? changedFields.join(', ') : changedFields;
  safeSend('profile-updated', {
    to: user.email,
    subject: 'Tus datos personales fueron actualizados',
    template: 'profile-updated',
    templateData: {
      firstName: user.firstName || user.name || '',
      changedFields: fields,
      profileUrl: `${FRONTEND_URL()}/perfil/${user._id || user.id}`
    },
    text: `Tus datos personales fueron actualizados (${fields}). Si no fuiste vos, cambia tu contrasena.`
  });
};

// ─── 9. CONTRASENA CAMBIADA ─────────────────────────────────────────
const sendPasswordChanged = (user) => {
  safeSend('password-changed', {
    to: user.email,
    subject: 'Tu contrasena fue cambiada',
    template: 'password-changed',
    templateData: {
      firstName: user.firstName || user.name || ''
    },
    text: 'Tu contrasena fue cambiada exitosamente. Si no fuiste vos, contacta soporte.'
  });
};

// ─── 10. VERIFICACION KYC RESULTADO ────────────────────────────────
const sendVerificationResult = (user, approved, rejectionReason) => {
  const label = approved ? 'aprobada' : 'rechazada';
  safeSend('verification-result', {
    to: user.email,
    subject: `Tu verificacion fue ${label}`,
    template: 'verification-result',
    templateData: {
      firstName: user.firstName || user.name || '',
      approved,
      rejectionReason: rejectionReason || null,
      profileUrl: `${FRONTEND_URL()}/perfil/verificacion`
    },
    text: `Tu verificacion fue ${label}.${rejectionReason ? ' Motivo: ' + rejectionReason : ''}`
  });
};

// ─── 11. DIGEST (NOTIFICACIONES + CHATS SIN RESPONDER) ─────────────
const sendDigest = (user, { unreadNotifications, notificationSamples, unansweredChats, chatSamples }) => {
  safeSend('digest', {
    to: user.email,
    subject: `Tenes ${unreadNotifications + unansweredChats} cosas pendientes en Tirito`,
    template: 'digest',
    templateData: {
      firstName: user.firstName || user.name || '',
      unreadNotifications: unreadNotifications || 0,
      notificationSamples: notificationSamples || [],
      unansweredChats: unansweredChats || 0,
      chatSamples: chatSamples || [],
      frontendUrl: FRONTEND_URL()
    },
    text: `Tenes ${unreadNotifications} notificaciones sin leer y ${unansweredChats} chats sin responder.`
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
  sendDigest
};
