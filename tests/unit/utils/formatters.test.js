const {
  formatProgress,
  formatChange,
  formatTrend,
  sanitizeHtml,
  formatNumber,
  formatDuration
} = require('../../../src/utils/formatters');

describe('Formatters', () => {
  describe('formatProgress', () => {
    it('should return 0 when target is 0', () => {
      expect(formatProgress(10, 0)).toBe(0);
    });

    it('should return 0 when target is negative', () => {
      expect(formatProgress(10, -5)).toBe(0);
    });

    it('should calculate correct percentage', () => {
      expect(formatProgress(75, 100)).toBe(75);
    });

    it('should round to nearest integer', () => {
      expect(formatProgress(33, 100)).toBe(33);
      expect(formatProgress(66, 100)).toBe(66);
    });

    it('should cap at 100%', () => {
      expect(formatProgress(150, 100)).toBe(100);
    });

    it('should never go below 0%', () => {
      expect(formatProgress(-10, 100)).toBe(0);
    });

    it('should handle fractional values', () => {
      expect(formatProgress(2.5, 10)).toBe(25);
    });
  });

  describe('formatChange', () => {
    it('should return "+100%" when previous is 0', () => {
      expect(formatChange(10, 0)).toBe('+100%');
    });

    it('should return "0%" when current is 0 and previous is 0', () => {
      expect(formatChange(0, 0)).toBe('0%');
    });

    it('should format positive change', () => {
      expect(formatChange(120, 100)).toBe('+20%');
    });

    it('should format negative change', () => {
      expect(formatChange(80, 100)).toBe('-20%');
    });

    it('should format no change', () => {
      expect(formatChange(100, 100)).toBe('0%');
    });

    it('should round to nearest integer', () => {
      expect(formatChange(105, 100)).toBe('+5%');
      expect(formatChange(95, 100)).toBe('-5%');
    });
  });

  describe('formatTrend', () => {
    it('should return "up" when current is greater', () => {
      expect(formatTrend(120, 100)).toBe('up');
    });

    it('should return "down" when current is less', () => {
      expect(formatTrend(80, 100)).toBe('down');
    });

    it('should return "stable" when values are equal', () => {
      expect(formatTrend(100, 100)).toBe('stable');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const dirty = '<p>Hello</p><script>alert("XSS")</script>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toBe('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const dirty = '<div onclick="alert(\'XSS\')">Click me</div>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const dirty = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('should return empty string for null input', () => {
      expect(sanitizeHtml(null)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHtml(123)).toBe('');
    });

    it('should preserve safe HTML', () => {
      const safe = '<p>Hello <strong>world</strong></p>';
      const clean = sanitizeHtml(safe);
      expect(clean).toBe(safe);
    });
  });

  describe('formatNumber', () => {
    it('should format with thousand separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(123)).toBe('123');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should return "0" for non-number input', () => {
      expect(formatNumber('abc')).toBe('0');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    it('should format hours only', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(150)).toBe('2h 30m');
    });

    it('should return "0m" for zero', () => {
      expect(formatDuration(0)).toBe('0m');
    });

    it('should return "0m" for negative', () => {
      expect(formatDuration(-10)).toBe('0m');
    });

    it('should handle null', () => {
      expect(formatDuration(null)).toBe('0m');
    });
  });
});
