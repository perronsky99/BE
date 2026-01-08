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
 * Incluye datos públicos y datos sensibles (el frontend decide qué mostrar)
 */
const transformPublicUser = (user) => ({
  id: user._id.toString(),
  // Username es el alias público
  username: user.username,
  // Nombre completo generado
  name: user.username || user.name,
  initials: getInitials(user.username || user.name),
  role: user.role,
  verificationStatus: user.verificationStatus,
  avatar: user.avatar || null,
  bio: user.bio || null,
  createdAt: user.createdAt,
  
  // Datos personales (el frontend decide si mostrarlos según permisos)
  firstName: user.firstName || null,
  lastName: user.lastName || null,
  
  // Ubicación general (público)
  estado: user.estado || null,
  municipio: user.municipio || null,
  
  // Datos sensibles (el frontend los oculta hasta que haya trabajo aceptado)
  documentType: user.documentType || null,
  documentNumber: user.documentNumber || null,
  birthDate: user.birthDate || null,
  direccion: user.direccion || null,
  phoneMobile: user.phoneMobile || null,
  phoneLocal: user.phoneLocal || null,
  email: user.email || null
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
