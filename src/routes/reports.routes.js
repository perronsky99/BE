const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');
const { createReport, listReports, closeReport, handleReportAction } = require('../controllers/reports.controller');

// Require auth for reporting
router.post('/', auth, createReport);

// Admin list & manage (require admin role)
router.get('/', auth, isAdmin, listReports);
router.put('/:id/close', auth, isAdmin, closeReport);

// Admin action endpoint: ban/unban/suspend via report
router.post('/:id/action', auth, isAdmin, handleReportAction);

// User-level actions on a report (block/unblock target for the reporter)
router.post('/:id/user-action', auth, handleReportAction);

module.exports = router;

