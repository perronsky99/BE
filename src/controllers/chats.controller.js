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
 * - Si el tirito está "open" sin asignar: solo pueden chatear si hay una solicitud activa
 *   - Creador puede chatear SI hay al menos una solicitud pending/accepted
 *   - Solicitante puede chatear SI tiene solicitud pending/accepted
 * - Si el tirito está "in_progress":
 *   - Creador puede chatear
 *   - Worker asignado puede chatear
 */
const canUserChat = async (userId, tirito) => {
  const userIdStr = userId.toString();
  const creatorIdStr = tirito.createdBy.toString();
  const assignedToStr = tirito.assignedTo ? tirito.assignedTo.toString() : null;

  // Si el tirito está cerrado, nadie puede chatear
  if (tirito.status === 'closed') {
    return { canChat: false, reason: 'tirito_closed' };
  }

  // Si el tirito está en progreso
  if (tirito.status === 'in_progress') {
    // El creador puede chatear
    if (userIdStr === creatorIdStr) {
      return { canChat: true, reason: null };
    }
    // El worker asignado puede chatear
    if (assignedToStr && userIdStr === assignedToStr) {
      return { canChat: true, reason: null };
    }
    // Si no es creador ni asignado, no puede chatear
    return { canChat: false, reason: 'not_assigned' };
  }

  // Si el tirito está abierto (open)
  if (tirito.status === 'open') {
    // Verificar si el usuario actual tiene una solicitud
    const userRequest = await TiritoRequest.findOne({ 
      tirito: tirito._id, 
      requester: userId,
      status: { $in: ['pending', 'accepted'] }
    });

    // Si es el creador
    if (userIdStr === creatorIdStr) {
      // El creador solo puede chatear si hay al menos una solicitud activa
      const hasActiveRequests = await TiritoRequest.exists({ 
        tirito: tirito._id, 
        status: { $in: ['pending', 'accepted'] }
      });
      
      if (!hasActiveRequests) {
        return { canChat: false, reason: 'no_requests' };
      }
      return { canChat: true, reason: null };
    }

    // Si es un solicitante
    if (userRequest) {
      return { canChat: true, reason: null };
    }

    // Verificar si tiene solicitud rechazada
    const rejectedRequest = await TiritoRequest.findOne({ 
      tirito: tirito._id, 
      requester: userId,
      status: 'rejected'
    });

    if (rejectedRequest) {
      return { canChat: false, reason: 'request_rejected' };
    }

    // No tiene solicitud
    return { canChat: false, reason: 'no_request' };
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

    // Verificar que existe el tirito
    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    // Verificar permisos de chat
    const { canChat, reason } = await canUserChat(userId, tirito);

    const isCreator = userId.toString() === tirito.createdBy.toString();
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

      if (!chat) {
        // Crear nuevo chat
        chat = await Chat.create({
          tiritoId,
          participants: [tirito.createdBy, userId]
        });
        await chat.populate('participants', 'name email username');
      }
    }

    // Obtener mensajes del chat
    const messages = await Message.find({ chatId: chat._id })
      .populate('sender', 'name email username')
      .sort({ createdAt: 1 });

    // Añadir info del título del tirito al chat response
    const chatResponse = chat.toObject();
    chatResponse.tiritoTitle = tirito.title;

    res.json({
      chat: chatResponse,
      messages,
      chatEnabled: canChat,
      chatDisabledReason: reason,
      tiritoStatus: tirito.status
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

    // Buscar o crear chat
    let chat = await Chat.findOne({
      tiritoId,
      participants: userId
    });

    const isNewChat = !chat;

    if (!chat) {
      chat = await Chat.create({
        tiritoId,
        participants: [tirito.createdBy, userId]
      });
    }

    // Crear mensaje
    const message = await Message.create({
      chatId: chat._id,
      sender: userId,
      content: content.trim()
    });

    await message.populate('sender', 'name email username');

    // Determinar quién recibe la notificación (el otro participante)
    // Normalizar participantes a IDs (soporta ObjectId o documentos poblados)
    let recipientId = null;
    if (Array.isArray(chat.participants)) {
      for (const p of chat.participants) {
        const pid = p && p._id ? p._id.toString() : (p ? p.toString() : null);
        if (pid && pid !== userId.toString()) {
          recipientId = pid;
          break;
        }
      }
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
