const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratings.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/', auth.required, ratingsController.createRating);
router.get('/user/:userId', ratingsController.getRatingsForUser);
router.get('/summary/:userId', ratingsController.getRatingsSummary);

module.exports = router;
