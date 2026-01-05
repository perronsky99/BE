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

module.exports = auth;
