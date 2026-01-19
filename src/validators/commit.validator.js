const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// Créer un commit manuel
exports.createCommitValidator = [
  body('project_id')
    .optional()
    .custom(val => mongoose.Types.ObjectId.isValid(val))
    .withMessage('project_id invalide'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('count doit être entre 1 et 100'),
  body('message')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('message max 500 caractères'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('timestamp doit être une date ISO8601')
];

// Mettre à jour un commit
exports.updateCommitValidator = [
  param('id')
    .custom(val => mongoose.Types.ObjectId.isValid(val))
    .withMessage('ID commit invalide'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('count doit être entre 1 et 100'),
  body('message')
    .optional()
    .isString()
    .isLength({ max: 500 })
];

// ID commit
exports.commitIdValidator = [
  param('id')
    .custom(val => mongoose.Types.ObjectId.isValid(val))
    .withMessage('ID commit invalide')
];

// Query stats
exports.statsQueryValidator = [
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage('year invalide')
];

// Query liste
exports.listQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page doit être >= 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit entre 1 et 100'),
  query('project')
    .optional()
    .custom(val => mongoose.Types.ObjectId.isValid(val))
    .withMessage('project invalide')
];
