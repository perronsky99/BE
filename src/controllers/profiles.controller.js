const User = require('../models/User');

/**
 * Transforma usuario DB a objeto público para frontend
 */
const transformPublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
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
