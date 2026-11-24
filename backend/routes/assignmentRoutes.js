const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, requireOrganizer } = require('../middleware/auth');

router.use(authenticate, requireOrganizer);

router.get('/:id/assignments', assignmentController.getAssignments);
router.post('/:id/assignments', assignmentController.assignChallenge);
router.post('/:id/assignments/bulk', assignmentController.bulkAssign);
router.post('/:id/assignments/auto', assignmentController.autoDistribute);
router.post('/:id/assignments/lock', assignmentController.lockAssignments);

module.exports = router;
