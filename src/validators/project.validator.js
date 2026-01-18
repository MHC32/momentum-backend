const { body, param } = require('express-validator');
const { PROJECT_TYPE, PROJECT_STATUS } = require('../utils/constants');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * Validator for creating a new project
 */
const createProjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),

  body('type')
    .notEmpty()
    .withMessage('Project type is required')
    .isIn(Object.values(PROJECT_TYPE))
    .withMessage(`Project type must be one of: ${Object.values(PROJECT_TYPE).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(`Project status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`),

  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon must not exceed 10 characters'),

  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color format (e.g., #FF5733 or #F57)'),

  body('book_pages')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Book pages must be a positive integer'),

  body('book_author')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Book author must not exceed 200 characters'),

  handleValidationErrors
];

/**
 * Validator for updating a project
 */
const updateProjectValidator = [
  param('id')
    .isMongoId()
    .withMessage('Project ID must be a valid MongoDB ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),

  body('type')
    .optional()
    .isIn(Object.values(PROJECT_TYPE))
    .withMessage(`Project type must be one of: ${Object.values(PROJECT_TYPE).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(`Project status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`),

  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon must not exceed 10 characters'),

  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color format (e.g., #FF5733 or #F57)'),

  body('book_pages')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Book pages must be a positive integer'),

  body('book_author')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Book author must not exceed 200 characters'),

  handleValidationErrors
];

/**
 * Validator for project ID parameter
 */
const projectIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Project ID must be a valid MongoDB ID'),

  handleValidationErrors
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  projectIdValidator
};
