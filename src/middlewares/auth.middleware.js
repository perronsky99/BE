const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Acceso no autorizado. Token requerido.' });
    }

    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    // Buscar usuario
    const user = await User.findById(decoded.sub);
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    // Rechazar requests si el usuario está baneado (auto-unban si expiró)
    if (user.isBanned) {
      if (user.banExpires && new Date(user.banExpires) <= new Date()) {
        // Auto-unban expired ban
        user.isBanned = false;
        user.banReason = null;
        user.bannedAt = null;
        user.banExpires = null;
        user.bannedBy = null;
        await user.save();
      } else {
        return res.status(403).json({ message: 'Cuenta bloqueada', reason: user.banReason, banExpires: user.banExpires });
      }
    }

    // Agregar usuario al request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Error de autenticación' });
  }
};

/**
 * Auth opcional: si hay token válido, resuelve req.user.
 * Si no hay token o es inválido, continúa con req.user = null.
 * Útil para endpoints públicos que muestran contenido extra a usuarios logueados.
 */
const optionalAuth = async (req, res, next) => {
  req.user = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) return next();

    const user = await User.findById(decoded.sub);
    if (user && !user.isBanned) {
      req.user = { id: user._id, email: user.email, role: user.role };
    }
  } catch (_) {
    // Silenciar: auth opcional no debe bloquear
  }
  next();
};

auth.optional = optionalAuth;

module.exports = auth;
