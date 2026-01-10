const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const logger = require('../utils/logger');
const mailer = require('../utils/mailer');

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

    const user = await User.findOne({ email });

    // Siempre responder éxito para evitar enumeración de usuarios
    if (!user) {
      logger.info(`[password] Request for non-existing email: ${email}`);
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
