require('dotenv').config();
const crypto = require('crypto');
const mailer = require('../src/utils/mailer');

(async () => {
  try {
    const token = crypto.randomBytes(20).toString('hex');
    const frontendBase = (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) || 'http://localhost:4200';
    const resetUrl = `${frontendBase.replace(/\/$/, '')}/auth/reset-password?token=${token}`;

    const to = process.env.TEST_RECIPIENT || 'cesardelfinr@gmail.com';
    const subject = 'Restablecer contraseña - Tirito';
    const templateData = { firstName: 'Cesar', resetUrl };
    const text = `Restablecer contraseña: ${resetUrl}`;

    console.log('Enviando reset link a', to, '->', resetUrl);

    const res = await mailer.sendMail({ to, subject, template: 'reset-password', templateData, text });

    console.log('Mailer respuesta:', res);
  } catch (e) {
    console.error('Fallo al enviar reset vía mailer:', e);
  }
})();
