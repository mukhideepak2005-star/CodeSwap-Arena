const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/rounds/:id/leaderboard', leaderboardController.getRoundLeaderboard);
router.get('/events/:id/leaderboard', leaderboardController.getEventLeaderboard);

module.exports = router;
