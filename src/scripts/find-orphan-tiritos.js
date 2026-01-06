const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Tirito = require('../models/Tirito');
const User = require('../models/User');

const OUTPUT_CSV = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : null;

async function findOrphans() {
  await connectDB();

  console.log('Buscando tiritos cuyo creador no existe...');

  // Obtener todos los ids distinct de createdBy
  const creatorIds = await Tirito.distinct('createdBy');

  const orphans = [];

  for (const id of creatorIds) {
    if (!id) continue;
    const exists = await User.exists({ _id: id });
    if (!exists) {
      // Obtener tiritos de este creatorId
      const tiritos = await Tirito.find({ createdBy: id }).lean();
      for (const t of tiritos) {
        orphans.push({
          id: t._id.toString(),
          title: t.title || '',
          createdBy: id.toString(),
          createdAt: t.createdAt ? t.createdAt.toISOString() : ''
        });
      }
    }
  }

  console.log(`Encontrados ${orphans.length} tiritos huérfanos.`);

  if (orphans.length > 0) {
    if (OUTPUT_CSV) {
      const csvPath = path.resolve(OUTPUT_CSV);
      const header = 'id,title,createdBy,createdAt\n';
      const rows = orphans.map(o => `${o.id},"${(o.title||'').replace(/"/g,'""')}",${o.createdBy},${o.createdAt}`).join('\n');
      fs.writeFileSync(csvPath, header + rows, 'utf8');
      console.log(`CSV escrito en ${csvPath}`);
    } else {
      console.table(orphans.slice(0, 200));
      if (orphans.length > 200) console.log('...mas resultados omitos (usa --output file.csv)');
    }
  }

  // Cerrar conexión
  await mongoose.disconnect();
}

findOrphans().catch(err => {
  console.error('Error ejecutando script:', err);
  process.exit(1);
});
