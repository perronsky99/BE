const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');
const { getCategories, createCategory, updateCategory, seedCategories } = require('../controllers/categories.controller');

// Público
router.get('/', getCategories);

// Admin
router.post('/', auth, isAdmin, createCategory);
router.patch('/:id', auth, isAdmin, updateCategory);
router.post('/seed', auth, isAdmin, seedCategories);

module.exports = router;
