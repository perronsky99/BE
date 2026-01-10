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
