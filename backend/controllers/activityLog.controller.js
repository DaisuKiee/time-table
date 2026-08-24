const { 
  getActivityLogs, 
  getActivityStats, 
  getUserActivitySummary,
  cleanupOldLogs 
} = require('../services/activityLogger.service');

// @desc    Get all activity logs
// @route   GET /api/activity-logs
// @access  Private (Admin only)
exports.getAllLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      limit = 100,
      skip = 0
    } = req.query;

    const result = await getActivityLogs({
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message
    });
  }
};

// @desc    Get activity statistics
// @route   GET /api/activity-logs/stats
// @access  Private (Admin only)
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const stats = await getActivityStats({
      startDate,
      endDate,
      userId
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity statistics',
      error: error.message
    });
  }
};

// @desc    Get user activity summary
// @route   GET /api/activity-logs/user/:userId
// @access  Private
exports.getUserSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own summary unless admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user summary'
      });
    }

    const summary = await getUserActivitySummary(userId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get user summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity summary',
      error: error.message
    });
  }
};

// @desc    Cleanup old logs
// @route   DELETE /api/activity-logs/cleanup
// @access  Private (Admin only)
exports.cleanupLogs = async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const result = await cleanupOldLogs(parseInt(daysToKeep));

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deleted} old activity logs`,
      data: result
    });
  } catch (error) {
    console.error('Cleanup logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up activity logs',
      error: error.message
    });
  }
};

module.exports = exports;
