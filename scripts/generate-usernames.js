/**
 * Script para generar usernames para usuarios existentes
 * Ejecutar: node scripts/generate-usernames.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');

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
  const num = Math.floor(Math.random() * 9000) + 1000;
  
  return `${adj}${noun}${num}`;
};

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    const User = require('../src/models/User');
    
    // Buscar usuarios sin username
    const usersWithoutUsername = await User.find({ 
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    });

    console.log(`📋 Usuarios sin username: ${usersWithoutUsername.length}`);

    for (const user of usersWithoutUsername) {
      let username = generateUsername();
      let exists = await User.findOne({ username });
      let attempts = 0;
      
      while (exists && attempts < 10) {
        username = generateUsername();
        exists = await User.findOne({ username });
        attempts++;
      }

      user.username = username;
      await user.save();
      console.log(`  ✓ ${user.email} → @${username}`);
    }

    console.log('\n✅ Proceso completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
