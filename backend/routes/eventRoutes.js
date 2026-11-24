const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, requireOrganizer } = require('../middleware/auth');
const { checkContestAccess } = require('../middleware/contestGuard');

// All event management routes require organizer or admin authentication
router.use(authenticate, requireOrganizer);

router.get('/', eventController.getMyEvents);
router.post('/', eventController.createEvent);

router.get('/:id', checkContestAccess('view_contest'), eventController.getEventById);
router.patch('/:id', checkContestAccess('view_contest'), eventController.updateEvent);
router.delete('/:id', checkContestAccess('view_contest'), eventController.deleteEvent);
router.post('/:id/archive', checkContestAccess('view_contest'), eventController.archiveEvent);
router.post('/:id/regenerate-pin', checkContestAccess('view_contest'), eventController.regeneratePin);

// Co-Organizers
router.post('/:id/organizers/invite', checkContestAccess('view_contest'), eventController.inviteCoOrganizer);
router.get('/:id/organizers', checkContestAccess('view_contest'), eventController.getCoOrganizers);
router.patch('/:id/organizers/:memberId', checkContestAccess('view_contest'), eventController.updateCoOrganizer);
router.delete('/:id/organizers/:memberId', checkContestAccess('view_contest'), eventController.removeCoOrganizer);

module.exports = router;
