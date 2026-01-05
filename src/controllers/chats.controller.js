const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Tirito = require('../models/Tirito');

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
    }).populate('participants', 'name email');

    if (!chat) {
      // Crear nuevo chat
      chat = await Chat.create({
        tiritoId,
        participants: [tirito.createdBy, userId]
      });
      await chat.populate('participants', 'name email');
    }

    // Obtener mensajes del chat
    const messages = await Message.find({ chatId: chat._id })
      .populate('sender', 'name email')
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

    // Buscar o crear chat
    let chat = await Chat.findOne({
      tiritoId,
      participants: userId
    });

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

    await message.populate('sender', 'name email');

    res.status(201).json({
      message: 'Mensaje enviado',
      data: message
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
      .populate('participants', 'name email')
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
