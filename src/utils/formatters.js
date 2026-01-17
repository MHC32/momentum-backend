/**
 * Formatting utility functions
 * Provides consistent data formatting across the application
 */

/**
 * Format progress as a percentage (0-100)
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @returns {number} - Percentage between 0 and 100
 */
function formatProgress(current, target) {
  if (!target || target <= 0) {
    return 0;
  }

  const progress = (current / target) * 100;
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

/**
 * Format change between two values as a percentage string
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {string} - Formatted change (e.g., "+18%" or "-5%")
 */
function formatChange(current, previous) {
  if (!previous || previous === 0) {
    if (current > 0) {
      return '+100%';
    }
    return '0%';
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);

  if (rounded > 0) {
    return `+${rounded}%`;
  } else if (rounded < 0) {
    return `${rounded}%`;
  } else {
    return '0%';
  }
}

/**
 * Determine trend direction between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {string} - 'up', 'down', or 'stable'
 */
function formatTrend(current, previous) {
  if (current > previous) {
    return 'up';
  } else if (current < previous) {
    return 'down';
  } else {
    return 'stable';
  }
}

/**
 * Basic HTML sanitization - REMOVES dangerous elements
 * ⚠️ WARNING: This is BASIC sanitization only!
 * For user-generated content, use a proper library like DOMPurify
 * This function only handles common XSS vectors and is NOT comprehensive
 *
 * @param {string} text - HTML string to sanitize
 * @returns {string} Sanitized HTML (dangerous tags/attributes removed)
 */
function sanitizeHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;

  // Remove script tags (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove all event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  sanitized = sanitized.replace(/data:text\/javascript/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Remove dangerous tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*>/gi, '');

  return sanitized;
}

/**
 * Format a number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} - Formatted number (e.g., "1,234,567")
 */
function formatNumber(num) {
  if (typeof num !== 'number') {
    return '0';
  }
  return num.toLocaleString('en-US');
}

/**
 * Format duration in minutes to human-readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration (e.g., "2h 30m")
 */
function formatDuration(minutes) {
  if (!minutes || minutes < 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

module.exports = {
  formatProgress,
  formatChange,
  formatTrend,
  sanitizeHtml,
  formatNumber,
  formatDuration
};
