const express = require('express');
const router = express.Router();
const executionController = require('../controllers/executionController');
const { authenticate } = require('../middleware/auth');

// Code run requires authentication (participant, organizer, or admin)
router.post('/run', authenticate, executionController.runCode);

module.exports = router;
