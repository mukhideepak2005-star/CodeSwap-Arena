const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate, requireParticipant } = require('../middleware/auth');

router.use(authenticate);

// Student task endpoints
router.get('/student/my-task', requireParticipant, submissionController.getMyTask);
router.get('/student/my-results', requireParticipant, submissionController.getMyResults);

// Submission actions
router.post('/submissions/modify', requireParticipant, submissionController.submitModifiedCode);
router.post('/submissions/debug', requireParticipant, submissionController.submitDebuggingSolution);

module.exports = router;
