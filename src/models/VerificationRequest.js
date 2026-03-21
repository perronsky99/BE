const mongoose = require('mongoose');

/**
 * VerificationRequest - Solicitud de verificación KYC
 * El usuario sube fotos de cédula + selfie y un admin revisa
 */
const verificationRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentFront: {
    type: String,
    required: [true, 'Foto frontal del documento es requerida']
  },
  documentBack: {
    type: String,
    required: [true, 'Foto reverso del documento es requerida']
  },
  selfieWithDocument: {
    type: String,
    required: [true, 'Selfie con documento es requerida']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectionReason: {
    type: String,
    default: null,
    maxlength: 500
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

verificationRequestSchema.index({ userId: 1, status: 1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
