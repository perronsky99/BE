const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getMySentRequests,
  acceptRequest,
  rejectRequest,
  getPendingCount
} = require('../controllers/tirito-requests.controller');
const auth = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/tirito-requests/my - Solicitudes pendientes para mis tiritos
router.get('/my', getMyRequests);

// GET /api/tirito-requests/sent - Mis solicitudes enviadas
router.get('/sent', getMySentRequests);

// GET /api/tirito-requests/count - Contar pendientes (para badge)
router.get('/count', getPendingCount);

// POST /api/tirito-requests - Crear solicitud
router.post('/', createRequest);

// PATCH /api/tirito-requests/:id/accept - Aceptar solicitud
router.patch('/:id/accept', acceptRequest);

// PATCH /api/tirito-requests/:id/reject - Rechazar solicitud
router.patch('/:id/reject', rejectRequest);

module.exports = router;
