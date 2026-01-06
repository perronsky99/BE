const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const fs = require('fs');
const path = require('path');

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Carpeta uploads creada');
}

// Conectar a MongoDB y arrancar servidor
const startServer = async () => {
  try {
    await connectDB();
    
    const http = require('http');
    const server = http.createServer(app);
    // Inicializar socket.io
    const socketUtil = require('./utils/socket');
    socketUtil.init(server);

    server.listen(port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
      console.log(`📋 Health check: http://localhost:${port}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
