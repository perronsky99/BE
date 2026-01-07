const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratings.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/', auth, ratingsController.createRating);
router.get('/user/:userId', ratingsController.getRatingsForUser);
router.get('/summary/:userId', ratingsController.getRatingsSummary);
router.get('/pending', auth, ratingsController.getPendingRatingsForUser);
router.get('/tirito/:tiritoId', auth, ratingsController.getRatingsForTirito);
router.post('/request', auth, ratingsController.requestRating);

module.exports = router;
