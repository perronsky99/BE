const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { frontendUrl, nodeEnv } = require('./config/env');

// Rutas
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const tiritosRoutes = require('./routes/tiritos.routes');
const chatsRoutes = require('./routes/chats.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const profilesRoutes = require('./routes/profiles.routes');
const ratingsRoutes = require('./routes/ratings.routes');
const tiritoRequestsRoutes = require('./routes/tirito-requests.routes');
const reportsRoutes = require('./routes/reports.routes');
const adminRoutes = require('./routes/admin.routes');
const categoriesRoutes = require('./routes/categories.routes');
const paymentsRoutes = require('./routes/payments.routes');
const verificationRoutes = require('./routes/verification.routes');
const referralRoutes = require('./routes/referral.routes');

// Middleware de errores
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Gzip compression
app.use(compression());

// CORS restrictivo
const allowedOrigins = frontendUrl
  ? frontendUrl.split(',').map(o => o.trim())
  : ['http://localhost:4200'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Bloqueado por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

// Body parsers con límites
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Servir archivos estáticos (uploads) con cache headers
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Ruta de health check (sin exponer versión en prod)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Métricas protegidas
const auth = require('./middlewares/auth.middleware');
const isAdmin = require('./middlewares/isAdmin.middleware');
const metrics = require('./utils/metrics');
app.get('/api/metrics', auth, isAdmin, (req, res) => {
  res.json(metrics.getMetrics());
});

// Rutas de la API
app.use('/api/auth', authRoutes);
const externalRoutes = require('./routes/external.routes');
app.use('/api/users', usersRoutes);
app.use('/api/tiritos', tiritosRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/tirito-requests', tiritoRequestsRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/referrals', referralRoutes);

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;
