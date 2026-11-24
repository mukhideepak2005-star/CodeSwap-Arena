const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swapController');
const { authenticate, requireOrganizer } = require('../middleware/auth');

router.use(authenticate, requireOrganizer);

router.get('/:id/swaps', swapController.getRoundSwaps);
router.post('/:id/swaps/draft', swapController.generateDraftMappings);
router.post('/:id/swaps/validate', swapController.validateMappings);
router.post('/:id/swaps/publish', swapController.publishRoundSwaps);

module.exports = router;
