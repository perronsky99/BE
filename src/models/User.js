const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Genera un username único basado en adjetivo + sustantivo + número
 */
const generateUsername = () => {
  const adjectives = [
    'Veloz', 'Amable', 'Genial', 'Astuto', 'Valiente', 'Noble', 'Sabio', 'Alegre',
    'Audaz', 'Brillante', 'Calmo', 'Diestro', 'Eficaz', 'Firme', 'Gentil', 'Habil',
    'Leal', 'Rapido', 'Sereno', 'Tenaz', 'Unico', 'Vivaz', 'Agil', 'Bravo'
  ];
  const nouns = [
    'Halcon', 'Delfin', 'Tigre', 'Aguila', 'Lobo', 'Leon', 'Oso', 'Zorro',
    'Puma', 'Jaguar', 'Condor', 'Dragon', 'Fenix', 'Grifo', 'Pegaso', 'Rayo',
    'Viento', 'Sol', 'Luna', 'Estrella', 'Cometa', 'Trueno', 'Fuego', 'Cristal'
  ];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000; // 4 dígitos
  
  return `${adj}${noun}${num}`;
};

const userSchema = new mongoose.Schema({
  // Username público (alias) - generado automáticamente
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  // Datos personales
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true
  },
  // Documento de identidad
  documentType: {
    type: String,
    enum: ['V', 'E'],
    required: [true, 'El tipo de documento es requerido']
  },
  documentNumber: {
    type: String,
    required: [true, 'La cédula es requerida'],
    unique: true,
    trim: true
  },
  birthDate: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida']
  },
  // Ubicación
  estado: {
    type: String,
    required: [true, 'El estado es requerido']
  },
  municipio: {
    type: String,
    required: [true, 'El municipio es requerido']
  },
  direccion: {
    type: String,
    required: [true, 'La dirección es requerida'],
    trim: true
  },
  // Teléfonos
  phoneMobile: {
    type: String,
    required: [true, 'El teléfono celular es requerido'],
    trim: true
  },
  phoneLocal: {
    type: String,
    trim: true
  },
  // Campo legacy para compatibilidad (nombre completo)
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'worker', 'business'],
    default: 'user'
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generar username antes de guardar si no tiene
userSchema.pre('save', async function(next) {
  // Generar username si no tiene
  if (!this.username) {
    let username = generateUsername();
    let exists = await mongoose.model('User').findOne({ username });
    let attempts = 0;
    while (exists && attempts < 10) {
      username = generateUsername();
      exists = await mongoose.model('User').findOne({ username });
      attempts++;
    }
    this.username = username;
  }
  
  // Generar nombre completo para compatibilidad
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  
  // Hash password si fue modificado
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparar password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
