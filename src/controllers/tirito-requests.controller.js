const TiritoRequest = require('../models/TiritoRequest');
const Tirito = require('../models/Tirito');
const Notification = require('../models/Notification');

/**
 * POST /api/tirito-requests
 * Crear una solicitud para hacer un tirito
 */
const createRequest = async (req, res, next) => {
  try {
    const { tiritoId, message } = req.body;
    const requesterId = req.user.id;

    // Validar tirito existe y está abierto
    const tirito = await Tirito.findById(tiritoId).populate('createdBy', 'name');
    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }
    if (tirito.status !== 'open') {
      return res.status(400).json({ message: 'Este tirito ya no está disponible' });
    }

    // No puede solicitar su propio tirito
    if (tirito.createdBy._id.toString() === requesterId.toString()) {
      return res.status(400).json({ message: 'No podés solicitar tu propio tirito' });
    }

    // Verificar si ya tiene una solicitud pendiente
    const existing = await TiritoRequest.findOne({ 
      tirito: tiritoId, 
      requester: requesterId,
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ message: 'Ya tenés una solicitud pendiente para este tirito' });
    }

    // Crear la solicitud
    const request = await TiritoRequest.create({
      tirito: tiritoId,
      requester: requesterId,
      message: message || ''
    });

    await request.populate('requester', 'name email');

    // Enviar notificación al creador del tirito
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: tirito.createdBy._id,
      type: 'tirito_request',
      title: 'Nueva solicitud de tirito',
      message: `${request.requester.name} quiere hacer tu tirito "${tirito.title}"`,
      fromUserId: requesterId,
      tiritoId: tirito._id,
      actionUrl: `/solicitudes`
    });

    if (io) {
      io.to(`user_${tirito.createdBy._id}`).emit('notification', notification);
    }

    res.status(201).json({ 
      message: 'Solicitud enviada correctamente',
      request: {
        id: request._id,
        tiritoId: request.tirito,
        status: request.status,
        message: request.message,
        createdAt: request.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tirito-requests/my
 * Obtener solicitudes pendientes para mis tiritos (como creador)
 */
const getMyRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Buscar tiritos del usuario que estén abiertos
    const myTiritos = await Tirito.find({ createdBy: userId, status: 'open' }).select('_id');
    const tiritoIds = myTiritos.map(t => t._id);

    // Buscar solicitudes pendientes para esos tiritos
    const requests = await TiritoRequest.find({
      tirito: { $in: tiritoIds },
      status: 'pending'
    })
      .populate('tirito', 'title description images')
      .populate('requester', 'name email')
      .sort({ createdAt: -1 });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      data: requests.map(r => ({
        id: r._id,
        tirito: {
          id: r.tirito._id,
          title: r.tirito.title,
          description: r.tirito.description
        },
        requester: {
          id: r.requester._id,
          name: r.requester.name,
          email: r.requester.email
        },
        message: r.message,
        status: r.status,
        createdAt: r.createdAt
      })),
      total: requests.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tirito-requests/sent
 * Obtener mis solicitudes enviadas
 */
const getMySentRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const requests = await TiritoRequest.find({ requester: userId })
      .populate('tirito', 'title status createdBy')
      .sort({ createdAt: -1 });

    res.json({
      data: requests.map(r => ({
        id: r._id,
        tirito: {
          id: r.tirito._id,
          title: r.tirito.title,
          status: r.tirito.status
        },
        message: r.message,
        status: r.status,
        createdAt: r.createdAt
      })),
      total: requests.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tirito-requests/:id/accept
 * Aceptar una solicitud
 */
const acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await TiritoRequest.findById(id)
      .populate('tirito')
      .populate('requester', 'name');

    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    // Verificar que el usuario es el creador del tirito
    if (request.tirito.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tenés permiso para aceptar esta solicitud' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Esta solicitud ya fue procesada' });
    }

    // Aceptar la solicitud
    request.status = 'accepted';
    await request.save();

    // Actualizar el tirito: pasa a in_progress con assignedTo
    const tirito = await Tirito.findById(request.tirito._id);
    tirito.status = 'in_progress';
    tirito.assignedTo = request.requester._id;
    await tirito.save();

    // Rechazar otras solicitudes pendientes para este tirito
    await TiritoRequest.updateMany(
      { tirito: tirito._id, status: 'pending', _id: { $ne: id } },
      { status: 'rejected' }
    );

    // Enviar notificación al solicitante
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: request.requester._id,
      type: 'request_accepted',
      title: '¡Solicitud aceptada!',
      message: `Tu solicitud para "${tirito.title}" fue aceptada. ¡A trabajar!`,
      fromUserId: userId,
      tiritoId: tirito._id,
      actionUrl: `/tiritos/${tirito._id}`
    });

    if (io) {
      io.to(`user_${request.requester._id}`).emit('notification', notification);
    }

    res.json({ 
      message: 'Solicitud aceptada',
      request: { id: request._id, status: 'accepted' }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tirito-requests/:id/reject
 * Rechazar una solicitud
 */
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await TiritoRequest.findById(id)
      .populate('tirito', 'title createdBy')
      .populate('requester', 'name');

    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    // Verificar que el usuario es el creador del tirito
    if (request.tirito.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tenés permiso para rechazar esta solicitud' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Esta solicitud ya fue procesada' });
    }

    // Rechazar la solicitud
    request.status = 'rejected';
    await request.save();

    // Enviar notificación al solicitante
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: request.requester._id,
      type: 'request_rejected',
      title: 'Solicitud rechazada',
      message: `Tu solicitud para "${request.tirito.title}" fue rechazada.`,
      fromUserId: userId,
      tiritoId: request.tirito._id,
      actionUrl: `/tiritos`
    });

    if (io) {
      io.to(`user_${request.requester._id}`).emit('notification', notification);
    }

    res.json({ 
      message: 'Solicitud rechazada',
      request: { id: request._id, status: 'rejected' }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tirito-requests/count
 * Contar solicitudes pendientes (para badge)
 */
const getPendingCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const myTiritos = await Tirito.find({ createdBy: userId, status: 'open' }).select('_id');
    const tiritoIds = myTiritos.map(t => t._id);

    const count = await TiritoRequest.countDocuments({
      tirito: { $in: tiritoIds },
      status: 'pending'
    });

    res.json({ count });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getMySentRequests,
  acceptRequest,
  rejectRequest,
  getPendingCount
};
