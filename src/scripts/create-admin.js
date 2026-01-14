const connectDB = require('../config/db');
const User = require('../models/User');
const { mongoUri } = require('../config/env');

const run = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const firstName = process.env.ADMIN_FIRSTNAME || 'Admin';
    const lastName = process.env.ADMIN_LASTNAME || 'User';

    let user = await User.findOne({ email });
    if (user) {
      console.log('Admin ya existe:', email);
      process.exit(0);
    }

    const newAdmin = new User({
      firstName,
      lastName,
      documentType: process.env.ADMIN_DOCUMENT_TYPE || 'V',
      documentNumber: process.env.ADMIN_DOCUMENT_NUMBER || `ADM${Date.now()}`,
      birthDate: process.env.ADMIN_BIRTHDATE ? new Date(process.env.ADMIN_BIRTHDATE) : new Date('1990-01-01'),
      estado: process.env.ADMIN_ESTADO || 'Estado',
      municipio: process.env.ADMIN_MUNICIPIO || 'Municipio',
      direccion: process.env.ADMIN_DIRECCION || 'Direccion admin',
      phoneMobile: process.env.ADMIN_PHONE || '+0000000000',
      email,
      password,
      role: 'admin',
      verificationStatus: 'verified'
    });

    await newAdmin.save();
    console.log('Admin creado:', email);
    process.exit(0);
  } catch (err) {
    console.error('Error creando admin:', err);
    process.exit(1);
  }
};

run();
