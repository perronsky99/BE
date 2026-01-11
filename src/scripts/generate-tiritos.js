const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Tirito = require('../models/Tirito');
const User = require('../models/User');

const DEFAULT_COUNT = 25;

const titles = [
  'Luz fundida en la calle',
  'Bache peligroso',
  'Árbol caído en la vía',
  'Fuga de agua',
  'Cable suelto',
  'Basura acumulada',
  'Vandalismo en pared',
  'Señal de tráfico dañada',
  'Columna inclinada',
  'Hoyo en acera',
  'Perro perdido',
  'Charco contaminado',
  'Alcantarilla tapada',
  'Ruido nocturno',
  'Grieta en puente',
  'Fuga de gas (simulada)',
  'Puerta de comercio abierta',
  'Cartel caído',
  'Letrero confuso',
  'Semáforo en rojo continuo'
];

const descriptions = [
  'Se necesita atención rápida, el problema está afectando el tránsito.',
  'Vecinos reportan esto desde hace días. Por favor revisar.',
  'Reporte de prueba generado automáticamente para testing.',
  'Ubicación aproximada, ver fotos para más detalles.',
  'No representa peligro inmediato pero requiere mantenimiento.',
  'Posible riesgo para peatones y vehículos.',
  'Se observa deterioro avanzado, coordinar reparación.',
  'Hecho por el script de generación de datos de prueba.'
];

const locations = [
  'Centro', 'Los Mangos', 'La Floresta', 'San José', 'El Paraíso', 'Altamira', 'Chacao', 'La Castellana'
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureUsers(minUsers = 3) {
  const count = await User.countDocuments();
  const created = [];
  if (count >= minUsers) return await User.find().limit(minUsers);

  const toCreate = minUsers - count;
  for (let i = 0; i < toCreate; i++) {
    const num = Date.now().toString().slice(-5) + i;
    const email = `test.user.${num}@example.com`;
    const docNumber = `${randomInt(10000000, 99999999)}`;
    const u = new User({
      firstName: `Test${i}`,
      lastName: `User${i}`,
      documentType: 'V',
      documentNumber: docNumber,
      birthDate: new Date(1990, 0, 1),
      estado: 'Distrito Capital',
      municipio: 'Libertador',
      direccion: `Calle Falsa ${randomInt(1,999)}`,
      phoneMobile: `0414${randomInt(1000000,9999999)}`,
      email,
      password: 'password123'
    });
    await u.save();
    created.push(u);
  }

  const users = await User.find().limit(minUsers);
  return users;
}

async function main() {
  const argv = process.argv.slice(2);
  const countArgIndex = argv.indexOf('--count');
  const count = countArgIndex !== -1 ? parseInt(argv[countArgIndex + 1], 10) || DEFAULT_COUNT : DEFAULT_COUNT;
  const dryRun = argv.includes('--dry-run');

  await connectDB();

  try {
    const users = await ensureUsers(5);

    const userIds = users.map(u => u._id);

    const docs = [];
    for (let i = 0; i < count; i++) {
      const title = `${rand(titles)} ${i + 1}`;
      const description = `${rand(descriptions)} (entrada ${i + 1})`;
      const location = rand(locations);
      const createdBy = rand(userIds);
      const status = rand(['open', 'in_progress', 'closed']);

      const doc = {
        title,
        description,
        location,
        createdBy,
        status,
        images: []
      };
      docs.push(doc);
    }

    if (dryRun) {
      console.log('Dry run: se mostrarán los tiritos a crear (no se insertan en DB)');
      console.log(docs.slice(0, 50));
      console.log(`Total a crear: ${docs.length}`);
    } else {
      const inserted = await Tirito.insertMany(docs);
      console.log(`✅ Insertados ${inserted.length} tiritos de prueba.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error generando tiritos:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
