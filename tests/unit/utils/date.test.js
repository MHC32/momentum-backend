const {
  getWeekNumber,
  getWeekDates,
  getDayOfYear,
  formatRelativeTime
} = require('../../../src/utils/date');

describe('Date Utils', () => {
  describe('getWeekNumber', () => {
    it('should return correct week number for date', () => {
      const date = new Date('2026-01-17');
      const week = getWeekNumber(date);
      expect(week).toBe(3);
    });

    it('should return week 1 for early January', () => {
      const date = new Date('2026-01-05');
      const week = getWeekNumber(date);
      expect(week).toBe(1); // January 5, 2026 is in week 1
    });

    it('should handle year-end week numbers', () => {
      const date = new Date('2025-12-29');
      const week = getWeekNumber(date);
      expect(week).toBe(52); // December 29, 2025 is in week 52 of 2025
    });

    it('should throw error for invalid date', () => {
      expect(() => getWeekNumber(null)).toThrow('Invalid date provided');
      expect(() => getWeekNumber('not a date')).toThrow('Invalid date provided');
      expect(() => getWeekNumber(new Date('invalid'))).toThrow('Invalid date provided');
    });
  });

  describe('getWeekDates', () => {
    it('should return start and end dates for week', () => {
      const { start, end } = getWeekDates(2026, 3);
      expect(start.getDay()).toBe(1); // Monday
      expect(end.getDay()).toBe(0); // Sunday
    });

    it('should span 6 days from Monday to Sunday', () => {
      const { start, end } = getWeekDates(2026, 10);
      const diffMs = end - start;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      // From Monday 00:00 to Sunday 00:00 is exactly 6 days
      expect(diffDays).toBe(6);
    });

    it('should handle ISO week 1 correctly when Jan 1 is Thursday', () => {
      // 2026: Jan 1 is Thursday, so week 1 starts Dec 29, 2025
      const { start, end } = getWeekDates(2026, 1);
      expect(start.getFullYear()).toBe(2025);
      expect(start.getMonth()).toBe(11); // December
      expect(start.getDate()).toBe(29);
    });

    it('should throw error for invalid week number', () => {
      expect(() => getWeekDates(2026, 0)).toThrow('Week number must be between 1 and 53');
      expect(() => getWeekDates(2026, 54)).toThrow('Week number must be between 1 and 53');
    });

    it('should throw error for invalid year', () => {
      expect(() => getWeekDates(1800, 1)).toThrow('Year must be a number between 1900 and 2100');
      expect(() => getWeekDates('2026', 1)).toThrow('Year must be a number between 1900 and 2100');
    });
  });

  describe('getDayOfYear', () => {
    it('should return correct day of year', () => {
      const date = new Date('2026-01-17');
      const day = getDayOfYear(date);
      expect(day).toBe(17);
    });

    it('should return 1 for January 1st', () => {
      const date = new Date('2026-01-01');
      const day = getDayOfYear(date);
      expect(day).toBe(1);
    });

    it('should return 365 for December 31st in non-leap year', () => {
      const date = new Date('2026-12-31');
      const day = getDayOfYear(date);
      expect(day).toBe(365);
    });

    it('should handle leap year correctly', () => {
      const date = new Date('2024-12-31'); // 2024 is a leap year
      const day = getDayOfYear(date);
      expect(day).toBe(366);
    });

    it('should throw error for invalid date', () => {
      expect(() => getDayOfYear(null)).toThrow('Invalid date provided');
      expect(() => getDayOfYear('not a date')).toThrow('Invalid date provided');
      expect(() => getDayOfYear(new Date('invalid'))).toThrow('Invalid date provided');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent time as "Il y a X minutes"', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinAgo);
      expect(result).toBe('Il y a 5 minutes');
    });

    it('should format hours as "Il y a X heures"', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo);
      expect(result).toBe('Il y a 2 heures');
    });

    it('should format days as "Il y a X jours"', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo);
      expect(result).toBe('Il y a 3 jours');
    });

    it('should format one minute as "Il y a 1 minute"', () => {
      const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000);
      const result = formatRelativeTime(oneMinAgo);
      expect(result).toBe('Il y a 1 minute');
    });

    it('should format one hour as "Il y a 1 heure"', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const result = formatRelativeTime(oneHourAgo);
      expect(result).toBe('Il y a 1 heure');
    });

    it('should format one day as "Il y a 1 jour"', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(oneDayAgo);
      expect(result).toBe('Il y a 1 jour');
    });

    it('should handle less than a minute as "Il y a quelques secondes"', () => {
      const nowish = new Date(Date.now() - 30 * 1000);
      const result = formatRelativeTime(nowish);
      expect(result).toBe('Il y a quelques secondes');
    });
  });
});
