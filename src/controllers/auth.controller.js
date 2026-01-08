const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

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
      role: role || 'user'
    });

    // Generar token
    const token = generateToken(user);

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

module.exports = {
  register,
  login
};
