const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/contests', publicController.getPublicContests);
router.get('/contests/:id', publicController.getPublicContestById);
router.post('/contests/:id/join', publicController.joinContest);
router.post('/verify-pin', publicController.verifyPin);

module.exports = router;
