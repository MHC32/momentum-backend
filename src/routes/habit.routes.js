const express = require('express');
const {
  getHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabit,
  skipHabit,
  addLessonNotes,
  getHabitStats,
  getHabitsDueToday,
  archiveHabit,
  unarchiveHabit
} = require('../controllers/habit.controller');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(protect);

// ==================== CRUD BASIQUE ====================

/**
 * @route   GET /api/habits
 * @desc    Get all habits for current user
 * @access  Private
 */
router.get('/', getHabits);

/**
 * @route   GET /api/habits/today/due
 * @desc    Get habits due today (for dashboard)
 * @access  Private
 */
router.get('/today/due', getHabitsDueToday);

/**
 * @route   GET /api/habits/:id
 * @desc    Get single habit by ID
 * @access  Private
 */
router.get('/:id', getHabit);

/**
 * @route   GET /api/habits/:id/stats
 * @desc    Get detailed statistics for a habit
 * @access  Private
 */
router.get('/:id/stats', getHabitStats);

/**
 * @route   POST /api/habits
 * @desc    Create new habit
 * @access  Private
 */
router.post('/', createHabit);

/**
 * @route   PUT /api/habits/:id
 * @desc    Update habit
 * @access  Private
 */
router.put('/:id', updateHabit);

/**
 * @route   DELETE /api/habits/:id
 * @desc    Delete habit
 * @access  Private
 */
router.delete('/:id', deleteHabit);

// ==================== ACTIONS SPÉCIFIQUES ====================

/**
 * @route   POST /api/habits/:id/complete
 * @desc    Mark habit as completed for today
 * @access  Private
 */
router.post('/:id/complete', completeHabit);

/**
 * @route   POST /api/habits/:id/skip
 * @desc    Mark habit as skipped for today
 * @access  Private
 */
router.post('/:id/skip', skipHabit);

/**
 * @route   POST /api/habits/:id/lesson
 * @desc    Add lesson notes to learning habit
 * @access  Private
 */
router.post('/:id/lesson', addLessonNotes);

/**
 * @route   POST /api/habits/:id/archive
 * @desc    Archive habit (keep data but hide from active list)
 * @access  Private
 */
router.post('/:id/archive', archiveHabit);

/**
 * @route   POST /api/habits/:id/unarchive
 * @desc    Unarchive habit
 * @access  Private
 */
router.post('/:id/unarchive', unarchiveHabit);

module.exports = router;