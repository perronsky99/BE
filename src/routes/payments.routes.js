const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const {
  getSubscription,
  getPlans,
  subscribe,
  cancelSubscription,
  payForTirito,
  getTransactions
} = require('../controllers/payments.controller');

// Planes disponibles (público)
router.get('/plans', getPlans);

// Requieren auth
router.get('/subscription', auth, getSubscription);
router.post('/subscribe', auth, subscribe);
router.post('/cancel', auth, cancelSubscription);
router.post('/tirito/:tiritoId/pay', auth, payForTirito);
router.get('/transactions', auth, getTransactions);

module.exports = router;
