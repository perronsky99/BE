const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');
const { listAudits } = require('../controllers/admin.controller');

// Admin audits
router.get('/audits', auth, isAdmin, listAudits);

module.exports = router;
