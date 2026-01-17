/**
 * Get ISO week number for a given date
 * @param {Date} date - The date to get the week number for
 * @returns {number} - ISO week number (1-53)
 */
function getWeekNumber(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const MS_PER_DAY = 86400000; // 24 * 60 * 60 * 1000
  return Math.ceil((((d - yearStart) / MS_PER_DAY) + 1) / 7);
}

/**
 * Get start and end dates for a given ISO week
 * @param {number} year - The year
 * @param {number} weekNum - The ISO week number (1-53)
 * @returns {Object} - Object with start and end dates { start: Date, end: Date }
 */
function getWeekDates(year, weekNum) {
  // Validate inputs
  if (typeof year !== 'number' || year < 1900 || year > 2100) {
    throw new Error('Year must be a number between 1900 and 2100');
  }
  if (typeof weekNum !== 'number' || weekNum < 1 || weekNum > 53) {
    throw new Error('Week number must be between 1 and 53');
  }

  // ISO 8601 week date calculation
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7; // Sunday = 7

  // Find Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (jan4DayOfWeek - 1));

  // Calculate target week's Monday
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  // Calculate Sunday
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  return {
    start: targetMonday,
    end: targetSunday
  };
}

/**
 * Get day of year (1-366)
 * @param {Date} date - The date to get the day of year for
 * @returns {number} - Day of year (1-366)
 */
function getDayOfYear(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = current - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay) + 1;
  return dayOfYear;
}

/**
 * Format a date as relative time in French (e.g., "Il y a 5 minutes")
 * @param {Date} date - The date to format
 * @returns {string} - Formatted relative time string in French
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Less than a minute
  if (minutes < 1) {
    return 'Il y a quelques secondes';
  }

  // Minutes
  if (hours < 1) {
    if (minutes === 1) {
      return 'Il y a 1 minute';
    }
    return `Il y a ${minutes} minutes`;
  }

  // Hours
  if (days < 1) {
    if (hours === 1) {
      return 'Il y a 1 heure';
    }
    return `Il y a ${hours} heures`;
  }

  // Days
  if (days === 1) {
    return 'Il y a 1 jour';
  }
  return `Il y a ${days} jours`;
}

module.exports = {
  getWeekNumber,
  getWeekDates,
  getDayOfYear,
  formatRelativeTime
};
