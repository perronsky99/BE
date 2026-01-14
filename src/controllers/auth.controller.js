const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const logger = require('../utils/logger');
const mailer = require('../utils/mailer');
const PasswordResetAttempt = require('../models/PasswordResetAttempt');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { 
      firstName, 
      lastName, 
      documentType, 
      documentNumber, 
      birthDate,
      estado,
      municipio,
      direccion,
      phoneMobile,
      phoneLocal,
      email, 
      password, 
      role,
      bio,
      // Campo legacy para compatibilidad
      name: legacyName
    } = req.body;

    // Validar campos requeridos
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Nombres, apellidos, email y contraseña son requeridos' });
    }

    if (!documentType || !documentNumber) {
      return res.status(400).json({ message: 'Tipo y número de documento son requeridos' });
    }

    if (!birthDate) {
      return res.status(400).json({ message: 'La fecha de nacimiento es requerida' });
    }

    if (!estado || !municipio || !direccion) {
      return res.status(400).json({ message: 'Estado, municipio y dirección son requeridos' });
    }

    if (!phoneMobile) {
      return res.status(400).json({ message: 'El teléfono celular es requerido' });
    }

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Verificar si la cédula ya existe
    const existingDocument = await User.findOne({ documentNumber });
    if (existingDocument) {
      return res.status(400).json({ message: 'La cédula ya está registrada' });
    }

    // Crear usuario
    const user = await User.create({
      firstName,
      lastName,
      documentType,
      documentNumber,
      birthDate: new Date(birthDate),
      estado,
      municipio,
      direccion,
      phoneMobile,
      phoneLocal: phoneLocal || null,
      email,
      password,
      role: role || 'user',
      bio: bio || null
    });

    // Generar token
    const token = generateToken(user);

    // Enviar email de bienvenida (no bloquear respuesta al cliente)
    (async () => {
      try {
        const frontendBase = (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) || `${req.protocol}://${req.get('host')}`;
        const templateData = {
          firstName: user.firstName || user.name || '',
          frontendUrl: frontendBase.replace(/\/$/, '')
        };
        const subject = 'Bienvenido a Tirito';
        await mailer.sendMail({ to: user.email, subject, template: 'welcome', templateData, text: `Bienvenido a Tirito. Empezá en ${templateData.frontendUrl}` });
        logger.info(`[welcome] Bienvenida enviada a ${user.email}`);
      } catch (e) {
        logger.error(`[welcome] Error enviando bienvenida a ${user.email}: ${e?.message || e}`);
      }
    })();

    res.status(201).json({
      message: 'Usuario registrado correctamente',
        user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio || null,
        verificationStatus: user.verificationStatus
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario con password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Prevent login if user is banned (unless ban expired)
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
        const until = user.banExpires ? new Date(user.banExpires).toISOString() : null;
        return res.status(403).json({ message: `Cuenta bloqueada: ${user.banReason || 'motivos administrativos'}`, reason: user.banReason, banExpires: until });
      }
    }

    // Generar token
    const token = generateToken(user);

    res.json({
      message: 'Login exitoso',
      user: {
        id: user._id,
        name: user.name,
        bio: user.bio || null,
        username: user.username,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/password/request
 * body: { email }
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email es requerido' });

    const metrics = require('../utils/metrics');
    metrics.inc('password_reset_requests');

    const user = await User.findOne({ email });

    // Per-email rate limiting: limit attempts per account within a window
    try {
      const EMAIL_LIMIT = parseInt(process.env.EMAIL_REQUEST_LIMIT || '3', 10);
      const WINDOW_MS = parseInt(process.env.EMAIL_REQUEST_WINDOW_MS || String(60 * 60 * 1000), 10);
      const now = Date.now();
      let attempt = await PasswordResetAttempt.findOne({ email });
      if (!attempt) {
        attempt = await PasswordResetAttempt.create({ email, count: 1, windowStart: now });
      } else {
        const windowStart = attempt.windowStart ? new Date(attempt.windowStart).getTime() : 0;
        if (now - windowStart <= WINDOW_MS) {
          // inside window
          if (attempt.count >= EMAIL_LIMIT) {
            const metrics = require('../utils/metrics');
            metrics.inc('password_reset_rate_limited');
            logger.warn(`[password] Rate limited by email: ${email}`);
            return res.status(429).json({ message: 'Demasiadas solicitudes de recuperación de contraseña. Intentá más tarde.' });
          }
          attempt.count = attempt.count + 1;
          await attempt.save();
        } else {
          // window expired: reset
          attempt.count = 1;
          attempt.windowStart = now;
          await attempt.save();
        }
      }
    } catch (e) {
      // if rate limiter fails, don't block the flow — just log
      logger.error('[password] Error applying email rate limiter', e?.message || e);
    }

    // Siempre responder éxito para evitar enumeración de usuarios
    if (!user) {
      logger.info(`[password] Request for non-existing email: ${email}`);
      metrics.inc('password_reset_nonexistent');
      return res.json({ message: 'Si existe una cuenta con ese email, recibirás instrucciones para restablecer la contraseña' });
    }

    // Generar token y expiración (1 hora)
    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 3600000; // 1 hora

    // Evitar disparar validaciones de Mongoose si el documento de usuario está incompleto;
    // usamos un update directo para escribir solo los campos del token.
    await User.updateOne(
      { _id: user._id },
      { $set: { resetPasswordToken: token, resetPasswordExpires: expires } }
    );

    metrics.inc('password_reset_token_set');

    // Construir link de restablecimiento: usar FRONTEND_URL si está configurado
    // (en desarrollo suele ser http://localhost:4200). Si no existe, caer
    // en el host actual como fallback.
    const frontendBase = (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${frontendBase.replace(/\/$/, '')}/auth/reset-password?token=${token}`;

    // Enviar email con el link de restablecimiento. Si no hay transporte configurado,
    // el helper hará fallback a logs.
    try {
      const subject = 'Restablecer contraseña - Tirito';
      const templateData = { firstName: user.firstName || user.name || '', resetUrl };
      await mailer.sendMail({ to: email, subject, template: 'reset-password', templateData, text: `Restablecer contraseña: ${resetUrl}` });
      logger.info(`[password] Reset email queued for ${email}`);
    } catch (e) {
      // Mantener compatibilidad: loguear el link si falla el envío
      logger.error(`[password] Failed to send reset email to ${email}: ${e?.message || e}`);
      logger.info(`[password] Reset link for ${email}: ${resetUrl}`);
      metrics.inc('password_reset_email_fail');
    }

    return res.json({ message: 'Si existe una cuenta con ese email, recibirás instrucciones para restablecer la contraseña' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/password/reset
 * body: { token, password }
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });

    // Actualizar contraseña y limpiar token.
    // Algunas instancias de usuario en la BD pueden tener campos faltantes y
    // `save()` dispararía validaciones. Para asegurar que el password se hashee
    // por el pre('save') definido en el modelo pero sin validar el resto, usamos
    // save({ validateBeforeSave: false }).
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save({ validateBeforeSave: false });

    return res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword
};
