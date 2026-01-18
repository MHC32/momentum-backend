const { body, param } = require('express-validator');
const { GOAL_TYPE, GOAL_LEVEL, GOAL_CATEGORY } = require('../utils/constants');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * Validator for creating a new goal
 */
const createGoalValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Goal title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Goal title must be between 1 and 200 characters'),

  body('type')
    .notEmpty()
    .withMessage('Goal type is required')
    .isIn(Object.values(GOAL_TYPE))
    .withMessage(`Goal type must be one of: ${Object.values(GOAL_TYPE).join(', ')}`),

  body('category')
    .notEmpty()
    .withMessage('Goal category is required')
    .isIn(Object.values(GOAL_CATEGORY))
    .withMessage(`Goal category must be one of: ${Object.values(GOAL_CATEGORY).join(', ')}`),

  body('level')
    .optional()
    .isIn(Object.values(GOAL_LEVEL))
    .withMessage(`Goal level must be one of: ${Object.values(GOAL_LEVEL).join(', ')}`),

  body('target_value')
    .optional()
    .isNumeric()
    .withMessage('Target value must be a number'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Unit must not exceed 50 characters'),

  body('total_steps')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total steps must be a positive integer'),

  body('year')
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage('Year must be between 2020 and 2100'),

  handleValidationErrors
];

/**
 * Validator for updating a goal
 */
const updateGoalValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid goal ID'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('current_value')
    .optional()
    .isNumeric()
    .withMessage('Current value must be a number'),

  body('target_value')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Target value must be a positive integer'),

  handleValidationErrors
];

/**
 * Validator for updating goal progress
 */
const updateGoalProgressValidator = [
  param('id')
    .isMongoId()
    .withMessage('Goal ID must be a valid MongoDB ID'),

  body('current_value')
    .notEmpty()
    .withMessage('Current value is required')
    .isNumeric()
    .withMessage('Current value must be a number'),

  handleValidationErrors
];

/**
 * Validator for goal ID parameter
 */
const goalIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Goal ID must be a valid MongoDB ID'),

  handleValidationErrors
];

/**
 * Validator for quarter parameter
 */
const quarterValidator = [
  param('quarter')
    .isInt({ min: 1, max: 4 })
    .withMessage('Quarter must be between 1 and 4'),

  handleValidationErrors
];

/**
 * Validator for month parameter
 */
const monthValidator = [
  param('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  handleValidationErrors
];

/**
 * Validator for week parameter
 */
const weekValidator = [
  param('week')
    .isInt({ min: 1, max: 53 })
    .withMessage('Week must be between 1 and 53'),

  handleValidationErrors
];

module.exports = {
  createGoalValidator,
  updateGoalValidator,
  updateGoalProgressValidator,
  goalIdValidator,
  quarterValidator,
  monthValidator,
  weekValidator
};
