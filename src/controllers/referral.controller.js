const Referral = require('../models/Referral');
const User = require('../models/User');

// GET /api/referrals/code - Obtener o generar mi código de referido
const getMyReferralCode = async (req, res, next) => {
  try {
    let referral = await Referral.findOne({ referrerId: req.user.id, referredId: null });
    
    if (!referral) {
      const user = await User.findById(req.user.id).select('username').lean();
      const code = Referral.generateCode(user?.username);
      referral = await Referral.create({
        referrerId: req.user.id,
        code
      });
    }

    res.json({
      code: referral.code,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/register?ref=${referral.code}`
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/referrals/stats - Mis estadísticas de referidos
const getReferralStats = async (req, res, next) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user.id, referredId: { $ne: null } })
      .populate('referredId', 'username createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      totalReferred: referrals.length,
      registered: referrals.filter(r => r.status === 'registered').length,
      completedFirstTirito: referrals.filter(r => ['first_tirito', 'rewarded'].includes(r.status)).length,
      totalRewardsEarned: referrals.filter(r => r.status === 'rewarded').reduce((sum, r) => sum + r.rewardAmount, 0)
    };

    res.json({ stats, referrals });
  } catch (error) {
    next(error);
  }
};

// POST /api/referrals/validate - Validar código de referido (usado en registro)
const validateReferralCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Código requerido' });
    }

    const referral = await Referral.findOne({ code: code.toUpperCase(), referredId: null });
    if (!referral) {
      return res.status(404).json({ message: 'Código de referido inválido o ya utilizado' });
    }

    res.json({ valid: true, code: referral.code });
  } catch (error) {
    next(error);
  }
};

// POST /api/referrals/apply - Aplicar referido a usuario recién registrado (internal)
const applyReferral = async (code, referredUserId) => {
  if (!code) return null;
  
  try {
    const referral = await Referral.findOne({ code: code.toUpperCase(), referredId: null });
    if (!referral) return null;

    // No auto-referirse
    if (String(referral.referrerId) === String(referredUserId)) return null;

    referral.referredId = referredUserId;
    referral.status = 'registered';
    await referral.save();

    // Crear código nuevo para que el referridor pueda seguir invitando
    const user = await User.findById(referral.referrerId).select('username').lean();
    await Referral.create({
      referrerId: referral.referrerId,
      code: Referral.generateCode(user?.username)
    });

    return referral;
  } catch (e) {
    return null;
  }
};

module.exports = { getMyReferralCode, getReferralStats, validateReferralCode, applyReferral };
