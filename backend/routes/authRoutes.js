const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/organizer/register', authController.registerOrganizer);
router.post('/organizer/login', authController.loginOrganizer);
router.post('/participant/login', authController.loginParticipant);
router.post('/admin/login', authController.loginAdmin);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', (req, res) => res.json({ success: true, message: 'Logged out successfully.' }));

module.exports = router;
