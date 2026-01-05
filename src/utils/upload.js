const multer = require('multer');
const path = require('path');
const { upload: uploadConfig } = require('../config/env');

// Configurar almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadConfig.path);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `tirito-${uniqueSuffix}${ext}`);
  }
});

// Filtrar tipos de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo imágenes (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Configurar multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadConfig.maxFileSize, // 5MB
    files: 5 // Máximo 5 archivos
  }
});

module.exports = upload;
