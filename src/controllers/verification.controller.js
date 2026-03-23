const VerificationRequest = require('../models/VerificationRequest');
const User = require('../models/User');
const Audit = require('../models/Audit');
const emailService = require('../utils/emailService');

// POST /api/verification/submit - Enviar documentos para verificación
const submitVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Verificar que no tenga una solicitud pendiente
    const pending = await VerificationRequest.findOne({ userId, status: 'pending' });
    if (pending) {
      return res.status(400).json({ message: 'Ya tenés una solicitud de verificación pendiente' });
    }

    // Verificar que no esté ya verificado
    const user = await User.findById(userId);
    if (user.verificationStatus === 'verified') {
      return res.status(400).json({ message: 'Tu cuenta ya está verificada' });
    }

    if (!req.files || req.files.length < 3) {
      return res.status(400).json({ message: 'Debés subir 3 imágenes: frente del documento, reverso y selfie con documento' });
    }

    const [front, back, selfie] = req.files;

    const verification = await VerificationRequest.create({
      userId,
      documentFront: `/uploads/${front.filename}`,
      documentBack: `/uploads/${back.filename}`,
      selfieWithDocument: `/uploads/${selfie.filename}`
    });

    // Actualizar estado del usuario
    user.verificationStatus = 'pending';
    await user.save();

    res.status(201).json({
      message: 'Documentos enviados. Tu solicitud será revisada pronto.',
      verification: {
        id: verification._id,
        status: verification.status,
        submittedAt: verification.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/verification/status - Estado de mi verificación
const getVerificationStatus = async (req, res, next) => {
  try {
    const latest = await VerificationRequest.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const user = await User.findById(req.user.id).select('verificationStatus').lean();

    res.json({
      verificationStatus: user.verificationStatus,
      latestRequest: latest ? {
        id: latest._id,
        status: latest.status,
        rejectionReason: latest.rejectionReason,
        submittedAt: latest.createdAt,
        reviewedAt: latest.reviewedAt
      } : null
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/verification/pending - Listar solicitudes pendientes (admin)
const listPendingVerifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const verifications = await VerificationRequest.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username firstName lastName documentNumber email')
      .lean();

    const total = await VerificationRequest.countDocuments({ status: 'pending' });

    res.json({ verifications, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// POST /api/verification/:id/review - Aprobar o rechazar (admin)
const reviewVerification = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Acción inválida. Usar "approve" o "reject"' });
    }

    const verification = await VerificationRequest.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ message: 'Esta solicitud ya fue procesada' });
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (action === 'approve') {
      verification.status = 'approved';
      user.verificationStatus = 'verified';
    } else {
      if (!rejectionReason) {
        return res.status(400).json({ message: 'Motivo de rechazo es requerido' });
      }
      verification.status = 'rejected';
      verification.rejectionReason = rejectionReason;
      user.verificationStatus = 'rejected';
    }

    verification.reviewedBy = req.user.id;
    verification.reviewedAt = new Date();

    await verification.save();
    await user.save();

    // Registrar en auditoría
    await Audit.create({
      actor: req.user.id,
      action: `verification_${action}`,
      targetUser: user._id,
      reason: action === 'reject' ? rejectionReason : 'Documentos aprobados',
      meta: { verificationId: verification._id }
    });

    // Email: notificar resultado de verificación KYC
    const approved = action === 'approve';
    emailService.sendVerificationResult(user, approved, approved ? null : rejectionReason);

    res.json({
      message: approved ? 'Usuario verificado exitosamente' : 'Verificación rechazada',
      verification: {
        id: verification._id,
        status: verification.status,
        reviewedAt: verification.reviewedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitVerification, getVerificationStatus, listPendingVerifications, reviewVerification };
