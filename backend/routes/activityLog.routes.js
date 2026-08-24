const express = require('express');
const router = express.Router();
const {
  getAllLogs,
  getStats,
  getUserSummary,
  cleanupLogs
} = require('../controllers/activityLog.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Statistics endpoint
router.get('/stats', authorize('admin', 'scheduling_officer'), getStats);

// User summary (users can view their own, admins can view any)
router.get('/user/:userId', getUserSummary);

// Admin only routes
router.get('/', authorize('admin'), getAllLogs);
router.delete('/cleanup', authorize('admin'), cleanupLogs);

module.exports = router;
