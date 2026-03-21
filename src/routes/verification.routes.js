const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');
const multer = require('multer');
const path = require('path');
const {
  submitVerification,
  getVerificationStatus,
  listPendingVerifications,
  reviewVerification
} = require('../controllers/verification.controller');

// Configurar multer para documentos de verificación
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Solo se permiten JPG, PNG o PDF'));
    }
    cb(null, `verification-${req.user.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
    cb(null, true);
  }
});

// Usuario autenticado
router.get('/status', auth, getVerificationStatus);
router.post('/submit', auth, upload.array('documents', 3), submitVerification);

// Admin
router.get('/pending', auth, isAdmin, listPendingVerifications);
router.post('/:id/review', auth, isAdmin, reviewVerification);

module.exports = router;
