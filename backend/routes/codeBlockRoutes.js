const express = require('express');
const router = express.Router();
const codeBlockController = require('../controllers/codeBlockController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', codeBlockController.getCodeBlocks);
router.get('/:id', codeBlockController.getCodeBlockById);
router.post('/', codeBlockController.createCodeBlock);
router.patch('/:id', codeBlockController.updateCodeBlock);
router.delete('/:id', codeBlockController.deleteCodeBlock);

module.exports = router;
