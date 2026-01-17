const express = require('express');
const { 
  getDashboard, 
  getFocusTasks, 
  getRecentActivity 
} = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protection: toutes les routes nécessitent authentification
router.use(protect);

// @route   GET /api/dashboard
// @desc    Get complete dashboard data
// @access  Private
router.get('/', getDashboard);

// @route   GET /api/dashboard/focus
// @desc    Get focus tasks only
// @access  Private
router.get('/focus', getFocusTasks);

// @route   GET /api/dashboard/activity
// @desc    Get recent activity only
// @access  Private
router.get('/activity', getRecentActivity);

module.exports = router;