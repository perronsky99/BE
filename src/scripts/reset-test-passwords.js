#!/usr/bin/env node
/**
 * Script de desarrollo: resetea contraseñas de todos los usuarios
 * a un valor conocido para poder probar flujos.
 *
 * Uso:
 *   node src/scripts/reset-test-passwords.js
 *   node src/scripts/reset-test-passwords.js MiPassword123
 *   node src/scripts/reset-test-passwords.js MiPassword123 usuario@email.com
 *
 * NUNCA ejecutar en producción.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { mongoUri } = require('../config/env');

const NEW_PASSWORD = process.argv[2] || 'Test1234';
const FILTER_EMAIL = process.argv[3] || null;

if (NEW_PASSWORD.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres (política actual del modelo)');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(NEW_PASSWORD, salt);

    const filter = FILTER_EMAIL ? { email: FILTER_EMAIL } : {};

    // Bypass Mongoose validators — actualización directa
    const result = await mongoose.connection.db
      .collection('users')
      .updateMany(filter, { $set: { password: hashed } });

    console.log(`${result.modifiedCount} usuario(s) actualizados`);
    console.log(`Nueva contraseña: ${NEW_PASSWORD}`);
    if (FILTER_EMAIL) console.log(`Solo para: ${FILTER_EMAIL}`);

    // Listar emails para referencia
    const users = await mongoose.connection.db
      .collection('users')
      .find(filter, { projection: { email: 1, name: 1, role: 1 } })
      .toArray();

    console.log('\nUsuarios afectados:');
    users.forEach(u => console.log(`  ${u.email} (${u.role || 'user'}) - ${u.name || 'sin nombre'}`));

    await mongoose.disconnect();
    console.log('\nListo. Ya puedes iniciar sesion con cualquiera de estos usuarios.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
