const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticate, requireOrganizer } = require('../middleware/auth');
const { checkContestAccess } = require('../middleware/contestGuard');

router.use(authenticate);

// List evaluations for contest (Organizer)
router.get('/events/:id/evaluations', requireOrganizer, checkContestAccess('evaluate_submissions'), evaluationController.getEvaluationsByEvent);

// Single evaluation details (Organizer)
router.get('/evaluations/:id', requireOrganizer, evaluationController.getEvaluationDetails);

// Organizer review
router.post('/evaluations/:id/review', requireOrganizer, evaluationController.reviewEvaluation);

module.exports = router;
