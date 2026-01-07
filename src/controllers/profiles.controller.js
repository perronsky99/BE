const User = require('../models/User');

/**
 * Obtiene las iniciales de un username o nombre
 */
const getInitials = (name) => {
  if (!name) return '??';
  // Si parece un username (PascalCase con números), tomar primeras 2 letras
  if (/^[A-Z][a-z]+[A-Z]/.test(name)) {
    return name.substring(0, 2).toUpperCase();
  }
  // Si es nombre normal, tomar iniciales de palabras
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Transforma usuario DB a objeto público para frontend
 * Usa username (alias) para proteger identidad real
 */
const transformPublicUser = (user) => ({
  id: user._id.toString(),
  // Username es el alias público
  username: user.username,
  // No exponemos el nombre real en perfiles públicos
  name: user.username || user.name,
  initials: getInitials(user.username || user.name),
  // No exponemos email en perfiles públicos
  role: user.role,
  verificationStatus: user.verificationStatus,
  avatar: user.avatar || null,
  createdAt: user.createdAt
});

// GET /api/profiles/:id  (público)
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(transformPublicUser(user));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile
};
