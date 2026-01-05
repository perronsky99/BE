const express = require('express');
const router = express.Router();
const {
  getTiritos,
  getTiritoById,
  createTirito,
  updateTiritoStatus,
  getMyTiritos
} = require('../controllers/tiritos.controller');
const auth = require('../middlewares/auth.middleware');
const upload = require('../utils/upload');

// GET /api/tiritos - Público (lista de tiritos abiertos)
router.get('/', getTiritos);

// Las siguientes rutas requieren autenticación
router.use(auth);

// GET /api/tiritos/my - Mis tiritos
router.get('/my', getMyTiritos);

// GET /api/tiritos/:id - Detalle de un tirito
router.get('/:id', getTiritoById);

// POST /api/tiritos - Crear tirito (con imágenes)
router.post('/', upload.array('images', 5), createTirito);

// PATCH /api/tiritos/:id/status - Actualizar status
router.patch('/:id/status', updateTiritoStatus);

module.exports = router;
