const User = require('../models/User');

// GET /api/users/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        bio: user.bio || null,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        birthDate: user.birthDate,
        estado: user.estado,
        municipio: user.municipio,
        direccion: user.direccion,
        phoneMobile: user.phoneMobile,
        phoneLocal: user.phoneLocal,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/me
const updateMe = async (req, res, next) => {
  try {
    const { name } = req.body;
    
    // Solo permitir actualizar el nombre
    const updates = {};
    if (name) updates.name = name;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Perfil actualizado',
      user: {
        id: user._id,
        name: user.name,
        bio: user.bio || null,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe
};

// GET /api/users/me/favorites
const getFavorites = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;

    const user = await User.findById(req.user.id).select('favorites');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const allIds = (user.favorites || []).map(f => f.toString());
    const total = allIds.length;
    const start = (page - 1) * limit;
    const slice = allIds.slice(start, start + limit);

    const Tirito = require('../models/Tirito');
    const items = await Tirito.find({ _id: { $in: slice } }).select('title description images status createdBy createdAt price');

    // Preserve order according to user's favorites array
    const itemsMap = new Map(items.map(i => [i._id.toString(), i]));
    const ordered = slice.map(id => itemsMap.get(id)).filter(Boolean);

    res.json({ favorites: ordered, total, page, limit });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/me/favorites/:tiritoId
const addFavorite = async (req, res, next) => {
  try {
    const { tiritoId } = req.params;
    const Tirito = require('../models/Tirito');
    const tirito = await Tirito.findById(tiritoId);
    if (!tirito) return res.status(404).json({ message: 'Tirito no encontrado' });
    // Use atomic update to avoid triggering full document validation
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favorites: tiritoId } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.status(201).json({ message: 'Agregado a favoritos' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/me/favorites/:tiritoId
const removeFavorite = async (req, res, next) => {
  try {
    const { tiritoId } = req.params;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favorites: tiritoId } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Eliminado de favoritos' });
  } catch (err) {
    next(err);
  }
};

module.exports.getFavorites = getFavorites;
module.exports.addFavorite = addFavorite;
module.exports.removeFavorite = removeFavorite;
