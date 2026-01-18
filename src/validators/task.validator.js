const { body, param } = require('express-validator');
const { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } = require('../utils/constants');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * Validator for creating a new task
 */
const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`),

  body('type')
    .optional()
    .isIn(Object.values(TASK_TYPE))
    .withMessage(`Type must be one of: ${Object.values(TASK_TYPE).join(', ')}`),

  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid ISO8601 date'),

  body('estimatedTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated time must be a positive integer'),

  body('project')
    .optional()
    .isMongoId()
    .withMessage('Project must be a valid MongoDB ID'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  handleValidationErrors
];

/**
 * Validator for updating a task
 */
const updateTaskValidator = [
  param('id')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ID'),

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

  body('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`),

  body('type')
    .optional()
    .isIn(Object.values(TASK_TYPE))
    .withMessage(`Type must be one of: ${Object.values(TASK_TYPE).join(', ')}`),

  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid ISO8601 date'),

  body('estimatedTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated time must be a positive integer'),

  body('project')
    .optional()
    .isMongoId()
    .withMessage('Project must be a valid MongoDB ID'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  handleValidationErrors
];

/**
 * Validator for task ID parameter
 */
const taskIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ID'),

  handleValidationErrors
];

/**
 * Validator for updating task status
 */
const updateTaskStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(TASK_STATUS))
    .withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`),

  handleValidationErrors
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  taskIdValidator,
  updateTaskStatusValidator
};
