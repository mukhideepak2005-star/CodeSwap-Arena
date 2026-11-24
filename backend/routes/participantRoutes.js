const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { authenticate, requireOrganizer } = require('../middleware/auth');
const { checkContestAccess } = require('../middleware/contestGuard');

// Contest-level participant operations
router.get('/events/:id/participants', authenticate, requireOrganizer, checkContestAccess('manage_participants'), participantController.getParticipants);
router.post('/events/:id/participants', authenticate, requireOrganizer, checkContestAccess('manage_participants'), participantController.addParticipant);
router.post('/events/:id/participants/import', authenticate, requireOrganizer, checkContestAccess('manage_participants'), participantController.importParticipants);

// Direct participant operations
router.patch('/participants/:id', authenticate, requireOrganizer, participantController.updateParticipant);
router.delete('/participants/:id', authenticate, requireOrganizer, participantController.deleteParticipant);

module.exports = router;
