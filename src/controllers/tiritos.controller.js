const Tirito = require('../models/Tirito');

/**
 * Transforma un tirito de MongoDB al formato esperado por el frontend
 */
const transformTirito = (tirito, baseUrl = '') => ({
  id: tirito._id.toString(),
  title: tirito.title,
  description: tirito.description,
  status: tirito.status,
  images: (tirito.images || []).map((img, idx) => ({
    id: `${tirito._id}-${idx}`,
    url: img && img.startsWith('http') ? img : `${baseUrl}${img}`,
    thumbnailUrl: img && img.startsWith('http') ? img : `${baseUrl}${img}`
  })),
  creatorId: tirito.createdBy?._id?.toString() || tirito.createdBy?.toString(),
  creatorName: tirito.createdBy?.name || 'Usuario',
  creatorAvatar: null,
  assignedTo: tirito.assignedTo ? (tirito.assignedTo._id ? tirito.assignedTo._id.toString() : tirito.assignedTo.toString()) : null,
  assignedToName: tirito.assignedTo?.name || null,
  location: tirito.location || null,
  createdAt: tirito.createdAt,
  updatedAt: tirito.updatedAt || tirito.createdAt
});

// GET /api/tiritos
const getTiritos = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtro
    const filter = {};
    
    // Por defecto excluir cerrados, a menos que se pida específicamente
    if (status && status !== 'all') {
      filter.status = status;
    } else {
      filter.status = { $ne: 'closed' };
    }

    // Búsqueda por texto en título o descripción
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Tirito.countDocuments(filter);
    const tiritos = await Tirito.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      data: tiritos.map(t => transformTirito(t, baseUrl)),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: skip + tiritos.length < total
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tiritos/:id
const getTiritoById = async (req, res, next) => {
  try {
    const tirito = await Tirito.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json(transformTirito(tirito, baseUrl));
  } catch (error) {
    next(error);
  }
};

// POST /api/tiritos
const createTirito = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    const userId = req.user.id;

    // REGLA CLAVE: Verificar si ya tiene un tirito activo
    const activeTiritos = await Tirito.countDocuments({
      createdBy: userId,
      status: { $in: ['open', 'in_progress'] }
    });

    if (activeTiritos >= 1) {
      return res.status(400).json({ message: 'Ya tenés un tirito activo' });
    }

    const { title, description } = req.body;

    // Procesar imágenes subidas
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    // Validar máximo de imágenes
    if (images.length > 5) {
      return res.status(400).json({ message: 'No podés subir más de 5 imágenes' });
    }

    const tirito = await Tirito.create({
      title,
      description,
      images,
      createdBy: userId
    });

    await tirito.populate('createdBy', 'name email');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      message: 'Tirito creado correctamente',
      tirito: transformTirito(tirito, baseUrl)
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tiritos/:id/status
const updateTiritoStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const userId = req.user.id.toString();

    console.log('[updateTiritoStatus] Request:', {
      tiritoId: req.params.id,
      newStatus: status,
      userId,
      userIdType: typeof userId
    });

    // Validar status
    if (!['open', 'in_progress', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    const tirito = await Tirito.findById(req.params.id);

    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    const creatorId = tirito.createdBy.toString();
    const isCreator = creatorId === userId;

    console.log('[updateTiritoStatus] Permissions:', {
      creatorId,
      userId,
      isCreator,
      currentStatus: tirito.status
    });

    // Lógica de permisos:
    // - Cualquier usuario autenticado puede "tomar" un tirito abierto (marcar in_progress)
    // - Solo el creador puede cerrar o reabrir su propio tirito
    if (status === 'in_progress' && !isCreator && tirito.status === 'open') {
      // Otro usuario toma el trabajo
      tirito.status = 'in_progress';
      tirito.assignedTo = userId;
      await tirito.save();
      console.log('[updateTiritoStatus] Tirito taken by:', userId);
    } else if (isCreator) {
      // El creador puede cambiar cualquier estado de su tirito
      tirito.status = status;
      await tirito.save();
      console.log('[updateTiritoStatus] Creator updated status to:', status);
    } else {
      // No tiene permisos
      console.log('[updateTiritoStatus] Permission denied');
      return res.status(403).json({ message: 'No tenés permiso para modificar este tirito' });
    }

    await tirito.populate('createdBy', 'name email');
    await tirito.populate('assignedTo', 'name email');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      message: 'Status actualizado',
      tirito: transformTirito(tirito, baseUrl)
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tiritos/my - Obtener mis tiritos
const getMyTiritos = async (req, res, next) => {
  try {
    const tiritos = await Tirito.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      data: tiritos.map(t => transformTirito(t, baseUrl)),
      total: tiritos.length,
      page: 1,
      limit: tiritos.length,
      hasMore: false
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tiritos/creator/:creatorId - Obtener tiritos por creatorId (público)
const getTiritosByCreator = async (req, res, next) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { createdBy: creatorId };

    const total = await Tirito.countDocuments(filter);
    const tiritos = await Tirito.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      data: tiritos.map(t => transformTirito(t, baseUrl)),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: skip + tiritos.length < total
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tiritos/can-create - Verificar si puede crear tirito
const canCreateTirito = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const activeTiritos = await Tirito.countDocuments({
      createdBy: userId,
      status: { $in: ['open', 'in_progress'] }
    });

    if (activeTiritos >= 1) {
      return res.json({
        canCreate: false,
        message: 'Ya tenés un tirito activo. Cerralo antes de crear otro.'
      });
    }

    res.json({ canCreate: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTiritos,
  getTiritoById,
  createTirito,
  updateTiritoStatus,
  getMyTiritos,
  canCreateTirito
  ,getTiritosByCreator
};
