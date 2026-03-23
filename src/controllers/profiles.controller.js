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
 * Perfil PÚBLICO - Solo datos seguros, nunca PII
 */
const transformPublicUser = (user) => ({
  id: user._id.toString(),
  username: user.username,
  name: user.username || user.name,
  initials: getInitials(user.username || user.name),
  role: user.role,
  verificationStatus: user.verificationStatus,
  avatar: user.avatar || null,
  bio: user.bio || null,
  createdAt: user.createdAt,
  estado: user.estado || null,
  municipio: user.municipio || null
});

/**
 * Perfil PRIVADO - Incluye datos sensibles (solo para relaciones confirmadas)
 */
const transformPrivateUser = (user) => ({
  ...transformPublicUser(user),
  firstName: user.firstName || null,
  lastName: user.lastName || null,
  documentType: user.documentType || null,
  documentNumber: user.documentNumber || null,
  birthDate: user.birthDate || null,
  direccion: user.direccion || null,
  phoneMobile: user.phoneMobile || null,
  phoneLocal: user.phoneLocal || null,
  email: user.email || null
});

const Tirito = require('../models/Tirito');

// GET /api/profiles/:id  (público, con PII condicional si hay tirito compartido)
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si hay usuario autenticado, verificar si comparten tirito
    const requesterId = req.user && req.user.id;
    if (requesterId && requesterId !== id) {
      const shared = await Tirito.findOne({
        status: { $in: ['in_progress', 'closed'] },
        $or: [
          { createdBy: requesterId, assignedTo: id },
          { createdBy: id, assignedTo: requesterId }
        ]
      });
      if (shared) {
        return res.json(transformPrivateUser(user));
      }
    }

    // Propio perfil → datos completos
    if (requesterId && requesterId === id) {
      return res.json(transformPrivateUser(user));
    }

    // Default: solo datos públicos
    res.json(transformPublicUser(user));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile
};
