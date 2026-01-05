const mongoose = require('mongoose');
const { mongoUri } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB conectado correctamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
