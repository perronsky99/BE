const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const {
  getMyReferralCode,
  getReferralStats,
  validateReferralCode
} = require('../controllers/referral.controller');

router.get('/code', auth, getMyReferralCode);
router.get('/stats', auth, getReferralStats);
router.post('/validate', validateReferralCode);

module.exports = router;
