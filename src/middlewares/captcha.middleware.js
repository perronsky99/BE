const fetch = require('node-fetch');
const metrics = require('../utils/metrics');
const logger = require('../utils/logger');

/**
 * Middleware to verify reCAPTCHA v3 token when RECAPTCHA_SECRET is configured.
 * If no secret is configured, it simply calls next().
 */
module.exports = async function captchaMiddleware(req, res, next) {
  try {
    const secret = process.env.RECAPTCHA_SECRET || '';
    if (!secret) return next();

    const token = req.body?.captchaToken;
    if (!token) {
      metrics.inc('password_reset_captcha_fail');
      logger.warn('[captcha] Missing captcha token');
      return res.status(400).json({ message: 'Captcha token es requerido' });
    }

    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
    });

    const data = await resp.json();
    if (!data || !data.success) {
      metrics.inc('password_reset_captcha_fail');
      logger.warn('[captcha] Verification failed', data);
      return res.status(400).json({ message: 'Captcha inválido' });
    }

    // Optionally check score for v3 (if present)
    if (typeof data.score === 'number' && data.score < 0.3) {
      return res.status(400).json({ message: 'Captcha sospechoso' });
    }

    // Passed
    next();
  } catch (e) {
    // If captcha verification fails unexpectedly, fail closed
    return res.status(400).json({ message: 'Error verificando captcha' });
  }
};
