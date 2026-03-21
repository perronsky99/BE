const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Tirito = require('../models/Tirito');
const { PLAN_LIMITS } = require('../models/Subscription');
const logger = require('../utils/logger');

/**
 * SISTEMA DE PAGOS — CARCASA MOCK
 * Simula el flujo completo de pagos sin conectar a pasarela real.
 * Todos los pagos se procesan como "mock_completed" inmediatamente.
 */

// GET /api/payments/subscription - Obtener suscripción actual
const getSubscription = async (req, res, next) => {
  try {
    let subscription = await Subscription.findOne({ userId: req.user.id });
    
    if (!subscription) {
      subscription = await Subscription.create({ userId: req.user.id, plan: 'free' });
    }

    // Verificar expiración
    if (subscription.endDate && new Date(subscription.endDate) < new Date() && subscription.plan !== 'free') {
      subscription.plan = 'free';
      subscription.status = 'expired';
      await subscription.save();
    }

    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    
    // Contar tiritos activos actuales
    const activeTiritos = await Tirito.countDocuments({
      createdBy: req.user.id,
      status: { $in: ['open', 'in_progress'] }
    });

    res.json({
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew
      },
      limits,
      usage: {
        activeTiritos,
        maxActiveTiritos: limits.maxActiveTiritos,
        canCreateMore: activeTiritos < limits.maxActiveTiritos
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/plans - Listar planes disponibles
const getPlans = async (req, res) => {
  res.json({
    plans: Object.entries(PLAN_LIMITS).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ...value
    }))
  });
};

// POST /api/payments/subscribe - Cambiar plan (MOCK: pago simulado)
const subscribe = async (req, res, next) => {
  try {
    const { plan, paymentMethod } = req.body;

    if (!plan || !PLAN_LIMITS[plan]) {
      return res.status(400).json({ message: 'Plan inválido' });
    }

    if (plan === 'free') {
      return res.status(400).json({ message: 'Para cancelar tu plan, usá /cancel' });
    }

    let subscription = await Subscription.findOne({ userId: req.user.id });
    if (!subscription) {
      subscription = await Subscription.create({ userId: req.user.id, plan: 'free' });
    }

    // MOCK: Simular procesamiento de pago
    const planInfo = PLAN_LIMITS[plan];
    const mockPaymentRef = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    logger.info('[MOCK PAYMENT] Procesando pago simulado', {
      userId: req.user.id,
      plan,
      amount: planInfo.price,
      paymentRef: mockPaymentRef
    });

    // "Procesar" el pago (siempre exitoso en mock)
    subscription.plan = plan;
    subscription.status = 'active';
    subscription.startDate = new Date();
    subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
    subscription.paymentMethod = paymentMethod || 'mock';
    subscription.lastPaymentRef = mockPaymentRef;
    await subscription.save();

    res.json({
      message: 'Suscripción activada exitosamente',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        paymentRef: mockPaymentRef
      },
      limits: PLAN_LIMITS[plan],
      _mock: true,
      _mockMessage: 'Este pago fue simulado. En producción se conectará a pasarela real.'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/cancel - Cancelar suscripción (volver a free)
const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user.id });
    
    if (!subscription || subscription.plan === 'free') {
      return res.status(400).json({ message: 'No tenés una suscripción activa' });
    }

    subscription.plan = 'free';
    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();

    res.json({ message: 'Suscripción cancelada. Volviste al plan Free.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/tirito/:tiritoId/pay - Pagar por un tirito con precio (MOCK)
const payForTirito = async (req, res, next) => {
  try {
    const tirito = await Tirito.findById(req.params.tiritoId);
    if (!tirito) {
      return res.status(404).json({ message: 'Tirito no encontrado' });
    }

    if (!tirito.price || tirito.priceType === 'free') {
      return res.status(400).json({ message: 'Este tirito es gratuito' });
    }

    // Verificar que no exista ya una transacción
    const existing = await Transaction.findOne({ tiritoId: tirito._id });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una transacción para este tirito' });
    }

    const platformFee = Math.round(tirito.price * 0.05 * 100) / 100; // 5%
    const mockPaymentRef = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const transaction = await Transaction.create({
      tiritoId: tirito._id,
      payerId: req.user.id,
      payeeId: tirito.assignedTo || null,
      amount: tirito.price,
      currency: tirito.currency || 'USD',
      platformFee,
      status: 'mock_completed',
      paymentMethod: req.body.paymentMethod || 'mock',
      paymentRef: mockPaymentRef,
      gatewayResponse: { mock: true, processedAt: new Date().toISOString() }
    });

    res.status(201).json({
      message: 'Pago procesado exitosamente',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        paymentRef: transaction.paymentRef
      },
      _mock: true,
      _mockMessage: 'Este pago fue simulado. En producción se conectará a pasarela real.'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/transactions - Historial de transacciones
const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const transactions = await Transaction.find({
      $or: [{ payerId: req.user.id }, { payeeId: req.user.id }]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('tiritoId', 'title')
      .lean();

    const total = await Transaction.countDocuments({
      $or: [{ payerId: req.user.id }, { payeeId: req.user.id }]
    });

    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubscription,
  getPlans,
  subscribe,
  cancelSubscription,
  payForTirito,
  getTransactions
};
