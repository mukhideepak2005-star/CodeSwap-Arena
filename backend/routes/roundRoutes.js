const express = require('express');
const router = express.Router();
const roundController = require('../controllers/roundController');
const { authenticate, requireOrganizer } = require('../middleware/auth');

// Public / Participant readable round details
router.get('/rounds/:id', authenticate, roundController.getRoundById);
router.get('/events/:id/rounds', authenticate, roundController.getRoundsByEvent);

// Organizer controlled mutations
router.post('/events/:id/rounds', authenticate, requireOrganizer, roundController.createRound);
router.post('/rounds/:id/start', authenticate, requireOrganizer, roundController.startRound);
router.post('/rounds/:id/pause', authenticate, requireOrganizer, roundController.pauseRound);
router.post('/rounds/:id/resume', authenticate, requireOrganizer, roundController.resumeRound);
router.post('/rounds/:id/lock', authenticate, requireOrganizer, roundController.lockSubmissions);
router.post('/rounds/:id/end', authenticate, requireOrganizer, roundController.endRound);

module.exports = router;
