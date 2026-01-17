/**
 * Custom validation utility functions
 * Provides reusable validators for application-specific types
 */

const mongoose = require('mongoose');
const {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
  PROJECT_TYPE,
  PROJECT_STATUS,
  GOAL_TYPE,
  GOAL_LEVEL,
  GOAL_CATEGORY,
  GOAL_STATUS,
  GOAL_PRIORITY,
  INTEGRATION_TYPE,
  BADGE_TYPE,
  BADGE_CATEGORY,
  BADGE_RARITY,
  ACTIVITY_TYPE
} = require('./constants');

/**
 * Check if a value is in an enum object
 * @param {*} value - Value to check
 * @param {Object} enumObject - Enum object containing valid values
 * @returns {boolean} - True if value is valid
 */
function isValidEnum(value, enumObject) {
  if (!value || !enumObject) {
    return false;
  }

  const validValues = Object.values(enumObject);
  return validValues.includes(value);
}

/**
 * Validate task priority
 * @param {string} value - Priority value to validate
 * @returns {boolean} - True if valid task priority
 */
function isValidTaskPriority(value) {
  return isValidEnum(value, TASK_PRIORITY);
}

/**
 * Validate task status
 * @param {string} value - Status value to validate
 * @returns {boolean} - True if valid task status
 */
function isValidTaskStatus(value) {
  return isValidEnum(value, TASK_STATUS);
}

/**
 * Validate task type
 * @param {string} value - Type value to validate
 * @returns {boolean} - True if valid task type
 */
function isValidTaskType(value) {
  return isValidEnum(value, TASK_TYPE);
}

/**
 * Validate project type
 * @param {string} value - Type value to validate
 * @returns {boolean} - True if valid project type
 */
function isValidProjectType(value) {
  return isValidEnum(value, PROJECT_TYPE);
}

/**
 * Validate project status
 * @param {string} value - Status value to validate
 * @returns {boolean} - True if valid project status
 */
function isValidProjectStatus(value) {
  return isValidEnum(value, PROJECT_STATUS);
}

/**
 * Validate goal type
 * @param {string} value - Type value to validate
 * @returns {boolean} - True if valid goal type
 */
function isValidGoalType(value) {
  return isValidEnum(value, GOAL_TYPE);
}

/**
 * Validate goal level
 * @param {string} value - Level value to validate
 * @returns {boolean} - True if valid goal level
 */
function isValidGoalLevel(value) {
  return isValidEnum(value, GOAL_LEVEL);
}

/**
 * Validate goal category
 * @param {string} value - Category value to validate
 * @returns {boolean} - True if valid goal category
 */
function isValidGoalCategory(value) {
  return isValidEnum(value, GOAL_CATEGORY);
}

/**
 * Validate goal status
 * @param {string} value - Status value to validate
 * @returns {boolean} - True if valid goal status
 */
function isValidGoalStatus(value) {
  return isValidEnum(value, GOAL_STATUS);
}

/**
 * Validate goal priority
 * @param {string} value - Priority value to validate
 * @returns {boolean} - True if valid goal priority
 */
function isValidGoalPriority(value) {
  return isValidEnum(value, GOAL_PRIORITY);
}

/**
 * Validate integration type
 * @param {string} value - Type value to validate
 * @returns {boolean} - True if valid integration type
 */
function isValidIntegrationType(value) {
  return isValidEnum(value, INTEGRATION_TYPE);
}

/**
 * Validate badge type
 * @param {string} value - Type value to validate
 * @returns {boolean} - True if valid badge type
 */
function isValidBadgeType(value) {
  return isValidEnum(value, BADGE_TYPE);
}

/**
 * Validate badge category
 * @param {string} value - Category value to validate
 * @returns {boolean} - True if valid badge category
 */
function isValidBadgeCategory(value) {
  return isValidEnum(value, BADGE_CATEGORY);
}

/**
 * Validate badge rarity
 * @param {string} value - Rarity value to validate
 * @returns {boolean} - True if valid badge rarity
 */
function isValidBadgeRarity(value) {
  return isValidEnum(value, BADGE_RARITY);
}

/**
 * Validate activity type
 * @param {string} value - Type value to validate
 * @returns {boolean} - True if valid activity type
 */
function isValidActivityType(value) {
  return isValidEnum(value, ACTIVITY_TYPE);
}

/**
 * Validate MongoDB ObjectId format
 * @param {string} value - ObjectId string to validate
 * @returns {boolean} - True if valid ObjectId format
 */
function isValidObjectId(value) {
  if (!value) {
    return false;
  }

  // Check if it's a valid MongoDB ObjectId
  return mongoose.Types.ObjectId.isValid(value);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL format
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate color hex format
 * @param {string} color - Color hex code to validate
 * @returns {boolean} - True if valid hex color format
 */
function isValidHexColor(color) {
  if (!color || typeof color !== 'string') {
    return false;
  }

  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Validate positive number
 * @param {*} value - Value to validate
 * @returns {boolean} - True if positive number
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Validate non-negative number
 * @param {*} value - Value to validate
 * @returns {boolean} - True if non-negative number
 */
function isNonNegativeNumber(value) {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}

module.exports = {
  // Generic validators
  isValidEnum,
  isValidObjectId,
  isValidEmail,
  isValidUrl,
  isValidHexColor,
  isPositiveNumber,
  isNonNegativeNumber,

  // Task validators
  isValidTaskPriority,
  isValidTaskStatus,
  isValidTaskType,

  // Project validators
  isValidProjectType,
  isValidProjectStatus,

  // Goal validators
  isValidGoalType,
  isValidGoalLevel,
  isValidGoalCategory,
  isValidGoalStatus,
  isValidGoalPriority,

  // Integration validators
  isValidIntegrationType,

  // Badge validators
  isValidBadgeType,
  isValidBadgeCategory,
  isValidBadgeRarity,

  // Activity validators
  isValidActivityType
};
