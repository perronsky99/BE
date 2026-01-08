const express = require('express');
const router = express.Router();
const {
  getTiritos,
  getTiritoById,
  createTirito,
  updateTiritoStatus,
  getMyTiritos,
  canCreateTirito,
  getTiritosByCreator,
  checkSharedTiritos
} = require('../controllers/tiritos.controller');
const auth = require('../middlewares/auth.middleware');
const upload = require('../utils/upload');

// GET /api/tiritos - Público (lista de tiritos abiertos)
router.get('/', getTiritos);

// GET /api/tiritos/creator/:creatorId - Tiritos publicados por un creator (público)
router.get('/creator/:creatorId', getTiritosByCreator);

// Las siguientes rutas requieren autenticación
router.use(auth);

// IMPORTANTE: Rutas específicas ANTES de /:id para evitar conflictos
// GET /api/tiritos/my - Mis tiritos
router.get('/my', getMyTiritos);


// GET /api/tiritos/me - Alias de /my (compatibilidad frontend)
router.get('/me', getMyTiritos);

// GET /api/tiritos/can-create - Verificar si puede crear
router.get('/can-create', canCreateTirito);

// GET /api/tiritos/shared/:userId - Verificar si hay tiritos compartidos con otro usuario
router.get('/shared/:userId', checkSharedTiritos);

// GET /api/tiritos/:id - Detalle de un tirito
router.get('/:id', getTiritoById);

// POST /api/tiritos - Crear tirito (con imágenes)
router.post('/', upload.array('images', 5), createTirito);

// PATCH /api/tiritos/:id/status - Actualizar status
router.patch('/:id/status', updateTiritoStatus);

module.exports = router;
