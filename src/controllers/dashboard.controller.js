const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const Habit = require('../models/Habit.model');

// ==================== HELPERS ====================

const getWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const getWeekEnd = () => {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getTomorrow = () => {
  const today = getToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

// @desc    Get Dashboard Data
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Dashboard controller works!'
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur dashboard',
      error: error.message
    });
  }
};