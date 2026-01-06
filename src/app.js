const express = require('express');
const cors = require('cors');
const path = require('path');

// Rutas
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const tiritosRoutes = require('./routes/tiritos.routes');
const chatsRoutes = require('./routes/chats.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const profilesRoutes = require('./routes/profiles.routes');

// Middleware de errores
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tirito App Backend v1.0' });
});

// Exponer métricas simples (JSON)
const metrics = require('./utils/metrics');
app.get('/api/metrics', (req, res) => {
  res.json(metrics.getMetrics());
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tiritos', tiritosRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profiles', profilesRoutes);

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;
