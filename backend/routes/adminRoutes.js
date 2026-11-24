const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getAdminDashboard);
router.get('/organizers', adminController.getAllOrganizers);
router.patch('/organizers/:id/status', adminController.setOrganizerStatus);
router.get('/contests', adminController.getAllContests);
router.get('/reports', adminController.getAbuseReports);
router.patch('/reports/:id', adminController.updateAbuseReport);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/settings', adminController.getPlatformSettings);
router.post('/settings', adminController.updatePlatformSettings);

module.exports = router;
