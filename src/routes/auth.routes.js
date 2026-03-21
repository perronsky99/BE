const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const { requestPasswordReset, resetPassword } = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const captchaMiddleware = require('../middlewares/captcha.middleware');
const metrics = require('../utils/metrics');

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.inc('login_rate_limited');
    return res.status(429).json({ message: 'Demasiados intentos de login. Intentá en 15 minutos.' });
  }
});

// Rate limiting para registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.inc('register_rate_limited');
    return res.status(429).json({ message: 'Demasiados intentos de registro. Intentá más tarde.' });
  }
});

// POST /api/auth/register
router.post('/register', registerLimiter, register);

// POST /api/auth/login
router.post('/login', loginLimiter, login);

// POST /api/auth/password/request
const passwordRequestLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: parseInt(process.env.PASSWORD_REQUEST_LIMIT || '5', 10),
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		metrics.inc('password_reset_rate_limited');
		return res.status(429).json({ message: 'Demasiadas solicitudes de recuperación de contraseña. Intentá más tarde.' });
	}
});
router.post('/password/request', passwordRequestLimiter, captchaMiddleware, requestPasswordReset);

// POST /api/auth/password/reset
router.post('/password/reset', resetPassword);

module.exports = router;
