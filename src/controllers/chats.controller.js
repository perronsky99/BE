const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Tirito = require('../models/Tirito');
const User = require('../models/User');
const TiritoRequest = require('../models/TiritoRequest');
const { createNotification } = require('./notifications.controller');

/**
 * Verificar si un usuario puede chatear en un tirito
 * Reglas:
 * - Nadie puede chatear si el tirito está cerrado
 * - Creador siempre puede escribir a solicitantes (si hay solicitud pending/accepted)
 * - Solicitante puede escribir SOLO si:
 *   - Su solicitud fue aceptada, O
 *   - El creador ya le escribió primero (existe chat con mensajes del creador)
 * - Si tirito en progreso: creador y worker asignado pueden chatear
 */
const canUserChat = async (userId, tirito, otherUserId = null) => {
  const userIdStr = userId.toString();
  const creatorIdStr = tirito.createdBy._id ? tirito.createdBy._id.toString() : tirito.createdBy.toString();
  const assignedToStr = tirito.assignedTo 
    ? (tirito.assignedTo._id ? tirito.assignedTo._id.toString() : tirito.assignedTo.toString()) 
    : null;

  // Si el tirito está cerrado, nadie puede chatear
  if (tirito.status === 'closed') {
    return { canChat: false, reason: 'tirito_closed' };
  }

  // === CREADOR ===
  if (userIdStr === creatorIdStr) {
    // En progreso: siempre puede chatear con el worker asignado
    if (tirito.status === 'in_progress' && assignedToStr) {
      return { canChat: true, reason: null };
    }
    
    // Abierto: puede chatear si hay solicitudes activas
    if (tirito.status === 'open') {
      const hasActiveRequests = await TiritoRequest.exists({ 
        tirito: tirito._id, 
        status: { $in: ['pending', 'accepted'] }
      });
      
      if (!hasActiveRequests) {
        return { canChat: false, reason: 'no_requests' };
      }
      return { canChat: true, reason: null };
    }
  }

  // === NO ES EL CREADOR (es un solicitante/worker) ===
  
  // Si tirito está en progreso
  if (tirito.status === 'in_progress') {
    // Solo el worker asignado puede chatear
    if (assignedToStr && userIdStr === assignedToStr) {
      return { canChat: true, reason: null };
    }
    return { canChat: false, reason: 'not_assigned' };
  }

  // Si tirito está abierto
  if (tirito.status === 'open') {
    // Buscar la solicitud del usuario
    const userRequest = await TiritoRequest.findOne({ 
      tirito: tirito._id, 
      requester: userId
    });

    if (!userRequest) {
      return { canChat: false, reason: 'no_request' };
    }

    if (userRequest.status === 'rejected') {
      return { canChat: false, reason: 'request_rejected' };
    }

    // Si la solicitud está aceptada, puede chatear
    if (userRequest.status === 'accepted') {
      return { canChat: true, reason: null };
    }

    // Si la solicitud está pending, solo puede chatear si el creador ya le escribió
    if (userRequest.status === 'pending') {
      // Buscar si existe un chat donde el creador haya enviado mensajes
      const existingChat = await Chat.findOne({
        tiritoId: tirito._id,
        participants: { $all: [userId, creatorIdStr] }
      });

      if (existingChat) {
        // Verificar si el creador envió al menos un mensaje
        const creatorMessage = await Message.findOne({
          chatId: existingChat._id,
          sender: creatorIdStr
        });

        if (creatorMessage) {
          return { canChat: true, reason: null };
        }
      }

      // El creador no le ha escrito aún
      return { canChat: false, reason: 'waiting_creator_message' };
    }
  }

  // Estado desconocido
  return { canChat: false, reason: 'unknown_status' };
};

// GET /api/chats/:tiritoId
// Query params:
//   - withUser: (opcional) ID del usuario con quien chatear (para creadores con múltiples solicitantes)
const getChat = async (req, res, next) => {
  try {
    const { tiritoId } = req.params;
    const { withUser } = req.query;
    const userId = req.user.id;
    const userIdStr = userId.toString();

    // Verificar que existe el tirito
    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    const creatorIdStr = tirito.createdBy._id ? tirito.createdBy._id.toString() : tirito.createdBy.toString();

    // Verificar permisos de chat
    const { canChat, reason } = await canUserChat(userId, tirito);

    const isCreator = userIdStr === creatorIdStr;
    let chat;
    let otherUserId = null;

    if (isCreator && withUser) {
      // El creador quiere chatear con un solicitante específico
      // Verificar que el withUser tiene permiso para chatear (tiene solicitud)
      const targetUserRequest = await TiritoRequest.findOne({ 
        tirito: tiritoId, 
        requester: withUser,
        status: { $in: ['pending', 'accepted'] }
      });
      
      if (!targetUserRequest) {
        return res.status(403).json({ 
          message: 'Este usuario no tiene una solicitud activa para este tirito',
          chatEnabled: false
        });
      }

      // Buscar o crear chat entre creador y el usuario especificado
      chat = await Chat.findOne({
        tiritoId,
        participants: { $all: [userId, withUser] }
      }).populate('participants', 'name email username');

      if (!chat && canChat) {
        chat = await Chat.create({
          tiritoId,
          participants: [userId, withUser]
        });
        await chat.populate('participants', 'name email username');
      }
      otherUserId = withUser;
    } else {
      // Flujo normal: buscar chat existente del usuario
      chat = await Chat.findOne({
        tiritoId,
        participants: userId
      }).populate('participants', 'name email username');

      // Si no puede chatear y no tiene chat existente, no crear uno
      if (!chat && !canChat) {
        return res.status(403).json({ 
          message: reason || 'No tenés permiso para chatear en este tirito',
          chatEnabled: false
        });
      }

      if (!chat && canChat) {
        // Crear nuevo chat
        // Si el tirito está en progreso, el chat es entre creador y worker asignado
        // Si está abierto, el chat es entre creador y el usuario actual (solicitante)
        const otherParticipant = tirito.status === 'in_progress' && tirito.assignedTo
          ? (userIdStr === creatorIdStr ? tirito.assignedTo : tirito.createdBy)
          : (userIdStr === creatorIdStr ? null : tirito.createdBy);

        if (otherParticipant) {
          chat = await Chat.create({
            tiritoId,
            participants: [tirito.createdBy, tirito.status === 'in_progress' ? tirito.assignedTo : userId]
          });
          await chat.populate('participants', 'name email username');
        }
      }
    }

    // Si después de todo no hay chat, retornar error
    if (!chat) {
      return res.status(403).json({ 
        message: 'No se pudo crear o encontrar el chat',
        chatEnabled: false
      });
    }

    // Obtener mensajes del chat
    const messages = await Message.find({ chatId: chat._id })
      .populate('sender', '_id name email username')
      .sort({ createdAt: 1 });

    // Añadir info del título del tirito al chat response
    const chatResponse = chat.toObject();
    chatResponse.tiritoTitle = tirito.title;

    res.json({
      chat: chatResponse,
      messages,
      chatEnabled: canChat,
      chatDisabledReason: reason,
      tiritoStatus: tirito.status,
      tiritoCreatorId: tirito.createdBy._id ? tirito.createdBy._id.toString() : tirito.createdBy.toString()
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:tiritoId/message
const sendMessage = async (req, res, next) => {
  try {
    const { tiritoId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    // Verificar que existe el tirito
    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    // Verificar permisos de chat
    const { canChat, reason } = await canUserChat(userId, tirito);
    if (!canChat) {
      return res.status(403).json({ 
        message: reason || 'No tenés permiso para enviar mensajes en este tirito'
      });
    }

    // Obtener datos del usuario que envía el mensaje
    const sender = await User.findById(userId).select('name username');
    const creatorIdStr = tirito.createdBy._id ? tirito.createdBy._id.toString() : tirito.createdBy.toString();
    const userIdStr = userId.toString();

    // Determinar el otro participante del chat
    let otherParticipantId;
    if (userIdStr === creatorIdStr) {
      // El creador envía: el otro es el worker asignado (si in_progress) o buscar solicitud
      if (tirito.status === 'in_progress' && tirito.assignedTo) {
        otherParticipantId = tirito.assignedTo._id ? tirito.assignedTo._id.toString() : tirito.assignedTo.toString();
      } else {
        // Buscar un chat existente donde el creador sea participante
        const existingChat = await Chat.findOne({
          tiritoId,
          participants: { $all: [userId] }
        });
        if (existingChat) {
          otherParticipantId = existingChat.participants.find(p => {
            const pid = p._id ? p._id.toString() : p.toString();
            return pid !== userIdStr;
          });
          if (otherParticipantId && otherParticipantId._id) {
            otherParticipantId = otherParticipantId._id.toString();
          } else if (otherParticipantId) {
            otherParticipantId = otherParticipantId.toString();
          }
        }
      }
    } else {
      // Un solicitante/worker envía: el otro es el creador
      otherParticipantId = creatorIdStr;
    }

    // Buscar chat existente entre estos dos usuarios específicos
    let chat = null;
    if (otherParticipantId) {
      chat = await Chat.findOne({
        tiritoId,
        participants: { $all: [userId, otherParticipantId] }
      });
    }

    const isNewChat = !chat;

    if (!chat && otherParticipantId) {
      chat = await Chat.create({
        tiritoId,
        participants: [creatorIdStr, otherParticipantId === creatorIdStr ? userId : otherParticipantId]
      });
    } else if (!chat) {
      // Fallback: crear chat con creador y usuario actual
      chat = await Chat.create({
        tiritoId,
        participants: [tirito.createdBy, userId]
      });
    }

    // Refrescar chat para obtener todos los participantes (importante para emitir socket)
    chat = await Chat.findById(chat._id);

    // Crear mensaje
    const message = await Message.create({
      chatId: chat._id,
      sender: userId,
      content: content.trim()
    });

    await message.populate('sender', '_id name email username');

    // Emitir mensaje por Socket.IO en tiempo real
    const socketUtil = require('../utils/socket');
    const io = socketUtil.getIO();
    const logger = require('../utils/logger');
    
    // Obtener los IDs de participantes de forma segura
    const participantIds = [];
    if (Array.isArray(chat.participants)) {
      for (const p of chat.participants) {
        const pid = p && p._id ? p._id.toString() : (p ? p.toString() : null);
        if (pid) {
          participantIds.push(pid);
        }
      }
    }
    
    logger.info('Participantes del chat:', { participantIds, chatId: chat._id.toString() });
    
    // Determinar quién recibe la notificación (el otro participante)
    const recipientId = participantIds.find(pid => pid !== userId.toString()) || null;

    // Emitir el mensaje a todos los participantes del chat
    if (io && participantIds.length > 0) {
      logger.info('Emitiendo chat_message por Socket.IO', { chatId: chat._id.toString(), tiritoId, participantIds });
      // Emitir a ambos participantes
      participantIds.forEach(pid => {
        logger.info('Socket emit chat_message', { room: `user_${pid}`, messageId: message._id.toString() });
        io.to(`user_${pid}`).emit('chat_message', {
          chatId: chat._id.toString(),
          tiritoId: tiritoId,
          message: message
        });
      });
    }

    // Crear notificación para el receptor
    if (recipientId) {
      const notificationType = isNewChat ? 'chat_new' : 'chat_message';
      const senderLabel = sender?.username ? sender.username : (sender?.name || 'Alguien');
      const notificationTitle = isNewChat 
        ? `${senderLabel} te contactó`
        : `Nuevo mensaje de ${senderLabel}`;
      const notificationMessage = isNewChat
        ? `Alguien está interesado en tu tirito "${tirito.title}"`
        : content.trim().substring(0, 100);

      await createNotification({
        userId: recipientId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        fromUserId: userId,
        tiritoId: tiritoId,
        chatId: chat._id,
        actionUrl: `/chat/${tiritoId}`
      });
    }

    res.status(201).json({
      message: 'Mensaje enviado',
      data: message,
      isNewChat
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chats - Obtener todos mis chats
const getMyChats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name email username')
      .populate('tiritoId', 'title status')
      .sort({ createdAt: -1 });

    res.json({ chats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChat,
  sendMessage,
  getMyChats
};
