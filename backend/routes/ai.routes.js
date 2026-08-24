const express = require('express');
const router = express.Router();
const {
  recommendInstructor,
  recommendInstructorsForCurriculum,
  analyzeWorkloadBalance,
  predictScheduleQuality,
  getRecommendationInsights
} = require('../controllers/ai.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// AI recommendation routes (Admin/Scheduling Officer)
router.post('/recommend-instructor', authorize('admin', 'scheduling_officer'), recommendInstructor);
router.post('/recommend-curriculum', authorize('admin', 'scheduling_officer'), recommendInstructorsForCurriculum);
router.post('/analyze-workload', authorize('admin', 'scheduling_officer'), analyzeWorkloadBalance);
router.post('/predict-quality', authorize('admin', 'scheduling_officer'), predictScheduleQuality);
router.get('/insights', authorize('admin', 'scheduling_officer'), getRecommendationInsights);

module.exports = router;
