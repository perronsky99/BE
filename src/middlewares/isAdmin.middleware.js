const isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permiso denegado: se requiere rol admin' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Error en verificación de rol' });
  }
};

module.exports = isAdmin;
