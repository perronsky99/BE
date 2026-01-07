const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Tirito = require('../models/Tirito');
const User = require('../models/User');
const { createNotification } = require('./notifications.controller');

// GET /api/chats/:tiritoId
const getChat = async (req, res, next) => {
  try {
    const { tiritoId } = req.params;
    const userId = req.user.id;

    // Verificar que existe el tirito
    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    // Buscar chat existente o crear uno nuevo
    let chat = await Chat.findOne({
      tiritoId,
      participants: userId
    }).populate('participants', 'name email username');

    if (!chat) {
      // Crear nuevo chat
      chat = await Chat.create({
        tiritoId,
        participants: [tirito.createdBy, userId]
      });
      await chat.populate('participants', 'name email username');
    }

    // Obtener mensajes del chat
    const messages = await Message.find({ chatId: chat._id })
      .populate('sender', 'name email username')
      .sort({ createdAt: 1 });

    res.json({
      chat,
      messages
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
