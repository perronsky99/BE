const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { cedulaLookup } = require('../controllers/external.controller');

// Rate limiter: 30 requests per IP per hour by default
const limiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 30,
	standardHeaders: true,
	legacyHeaders: false
});

router.get('/cedula/:cedula', limiter, cedulaLookup);

module.exports = router;
