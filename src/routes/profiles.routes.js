const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/profiles.controller');

// GET /api/profiles/:id - Perfil público
router.get('/:id', getProfile);

module.exports = router;
