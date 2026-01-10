const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const { requestPasswordReset, resetPassword } = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const captchaMiddleware = require('../middlewares/captcha.middleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/password/request
// apply rate limit (by IP) and captcha verification when configured
const metrics = require('../utils/metrics');
const passwordRequestLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour window
	max: parseInt(process.env.PASSWORD_REQUEST_LIMIT || '5', 10), // limit per IP
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
