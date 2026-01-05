const Tirito = require('../models/Tirito');

// GET /api/tiritos
const getTiritos = async (req, res, next) => {
  try {
    const tiritos = await Tirito.find({ status: { $ne: 'closed' } })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ tiritos });
  } catch (error) {
    next(error);
  }
};

// GET /api/tiritos/:id
const getTiritoById = async (req, res, next) => {
  try {
    const tirito = await Tirito.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    res.json({ tirito });
  } catch (error) {
    next(error);
  }
};

// POST /api/tiritos
const createTirito = async (req, res, next) => {
  try {
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

    res.status(201).json({
      message: 'Tirito creado correctamente',
      tirito
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tiritos/:id/status
const updateTiritoStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;

    // Validar status
    if (!['open', 'in_progress', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    const tirito = await Tirito.findById(req.params.id);

    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    // Verificar ownership - solo el creador puede cambiar el status
    if (tirito.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tenés permiso para modificar este tirito' });
    }

    tirito.status = status;
    await tirito.save();

    await tirito.populate('createdBy', 'name email');

    res.json({
      message: 'Status actualizado',
      tirito
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
      .sort({ createdAt: -1 });

    res.json({ tiritos });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTiritos,
  getTiritoById,
  createTirito,
  updateTiritoStatus,
  getMyTiritos
};
