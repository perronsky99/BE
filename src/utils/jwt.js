const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

const generateToken = (user) => {
  const payload = {
    sub: user._id,
    role: user.role
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};
