const {
  isValidEnum,
  isValidTaskPriority,
  isValidTaskStatus,
  isValidTaskType,
  isValidProjectType,
  isValidProjectStatus,
  isValidGoalType,
  isValidGoalLevel,
  isValidGoalCategory,
  isValidGoalStatus,
  isValidGoalPriority,
  isValidIntegrationType,
  isValidBadgeType,
  isValidBadgeCategory,
  isValidBadgeRarity,
  isValidActivityType,
  isValidObjectId,
  isValidEmail,
  isValidUrl,
  isValidHexColor,
  isPositiveNumber,
  isNonNegativeNumber
} = require('../../../src/utils/validators');

const mongoose = require('mongoose');

describe('Validators', () => {
  describe('isValidEnum', () => {
    const testEnum = { FOO: 'foo', BAR: 'bar' };

    it('should return true for valid enum value', () => {
      expect(isValidEnum('foo', testEnum)).toBe(true);
    });

    it('should return false for invalid enum value', () => {
      expect(isValidEnum('baz', testEnum)).toBe(false);
    });

    it('should return false for null value', () => {
      expect(isValidEnum(null, testEnum)).toBe(false);
    });

    it('should return false for null enum', () => {
      expect(isValidEnum('foo', null)).toBe(false);
    });
  });

  describe('Task validators', () => {
    describe('isValidTaskPriority', () => {
      it('should validate correct priorities', () => {
        expect(isValidTaskPriority('low')).toBe(true);
        expect(isValidTaskPriority('normal')).toBe(true);
        expect(isValidTaskPriority('high')).toBe(true);
        expect(isValidTaskPriority('critical')).toBe(true);
      });

      it('should reject invalid priorities', () => {
        expect(isValidTaskPriority('invalid')).toBe(false);
        expect(isValidTaskPriority('medium')).toBe(false);
      });
    });

    describe('isValidTaskStatus', () => {
      it('should validate correct statuses', () => {
        expect(isValidTaskStatus('todo')).toBe(true);
        expect(isValidTaskStatus('in-progress')).toBe(true);
        expect(isValidTaskStatus('done')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(isValidTaskStatus('pending')).toBe(false);
        expect(isValidTaskStatus('completed')).toBe(false);
      });
    });

    describe('isValidTaskType', () => {
      it('should validate correct types', () => {
        expect(isValidTaskType('dev')).toBe(true);
        expect(isValidTaskType('personal')).toBe(true);
        expect(isValidTaskType('goal')).toBe(true);
        expect(isValidTaskType('habit')).toBe(true);
      });

      it('should reject invalid types', () => {
        expect(isValidTaskType('work')).toBe(false);
      });
    });
  });

  describe('Project validators', () => {
    describe('isValidProjectType', () => {
      it('should validate correct types', () => {
        expect(isValidProjectType('dev')).toBe(true);
        expect(isValidProjectType('personal')).toBe(true);
        expect(isValidProjectType('book')).toBe(true);
      });

      it('should reject invalid types', () => {
        expect(isValidProjectType('work')).toBe(false);
      });
    });

    describe('isValidProjectStatus', () => {
      it('should validate correct statuses', () => {
        expect(isValidProjectStatus('active')).toBe(true);
        expect(isValidProjectStatus('on-hold')).toBe(true);
        expect(isValidProjectStatus('completed')).toBe(true);
        expect(isValidProjectStatus('archived')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(isValidProjectStatus('pending')).toBe(false);
      });
    });
  });

  describe('Goal validators', () => {
    describe('isValidGoalType', () => {
      it('should validate correct types', () => {
        expect(isValidGoalType('numeric')).toBe(true);
        expect(isValidGoalType('steps')).toBe(true);
        expect(isValidGoalType('simple')).toBe(true);
      });

      it('should reject invalid types', () => {
        expect(isValidGoalType('boolean')).toBe(false);
      });
    });

    describe('isValidGoalLevel', () => {
      it('should validate correct levels', () => {
        expect(isValidGoalLevel('annual')).toBe(true);
        expect(isValidGoalLevel('quarterly')).toBe(true);
        expect(isValidGoalLevel('monthly')).toBe(true);
        expect(isValidGoalLevel('weekly')).toBe(true);
        expect(isValidGoalLevel('daily')).toBe(true);
        expect(isValidGoalLevel('none')).toBe(true);
      });

      it('should reject invalid levels', () => {
        expect(isValidGoalLevel('yearly')).toBe(false);
      });
    });

    describe('isValidGoalCategory', () => {
      it('should validate correct categories', () => {
        expect(isValidGoalCategory('financial')).toBe(true);
        expect(isValidGoalCategory('professional')).toBe(true);
        expect(isValidGoalCategory('learning')).toBe(true);
        expect(isValidGoalCategory('personal')).toBe(true);
        expect(isValidGoalCategory('health')).toBe(true);
      });

      it('should reject invalid categories', () => {
        expect(isValidGoalCategory('work')).toBe(false);
      });
    });

    describe('isValidGoalStatus', () => {
      it('should validate correct statuses', () => {
        expect(isValidGoalStatus('not-started')).toBe(true);
        expect(isValidGoalStatus('on-track')).toBe(true);
        expect(isValidGoalStatus('at-risk')).toBe(true);
        expect(isValidGoalStatus('behind')).toBe(true);
        expect(isValidGoalStatus('completed')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(isValidGoalStatus('pending')).toBe(false);
      });
    });

    describe('isValidGoalPriority', () => {
      it('should validate correct priorities', () => {
        expect(isValidGoalPriority('low')).toBe(true);
        expect(isValidGoalPriority('medium')).toBe(true);
        expect(isValidGoalPriority('high')).toBe(true);
        expect(isValidGoalPriority('critical')).toBe(true);
      });

      it('should reject invalid priorities', () => {
        expect(isValidGoalPriority('normal')).toBe(false);
      });
    });
  });

  describe('Integration validators', () => {
    describe('isValidIntegrationType', () => {
      it('should validate correct integration types', () => {
        expect(isValidIntegrationType('none')).toBe(true);
        expect(isValidIntegrationType('commits')).toBe(true);
        expect(isValidIntegrationType('books')).toBe(true);
        expect(isValidIntegrationType('rise_savings')).toBe(true);
        expect(isValidIntegrationType('rise_expenses')).toBe(true);
      });

      it('should reject invalid integration types', () => {
        expect(isValidIntegrationType('invalid')).toBe(false);
        expect(isValidIntegrationType('github')).toBe(false);
      });
    });
  });

  describe('Badge validators', () => {
    describe('isValidBadgeType', () => {
      it('should validate correct badge types', () => {
        expect(isValidBadgeType('first-task')).toBe(true);
        expect(isValidBadgeType('first-commit')).toBe(true);
        expect(isValidBadgeType('task-master-10')).toBe(true);
        expect(isValidBadgeType('commit-streak-7')).toBe(true);
        expect(isValidBadgeType('goal-crusher')).toBe(true);
      });

      it('should reject invalid badge types', () => {
        expect(isValidBadgeType('invalid')).toBe(false);
        expect(isValidBadgeType('super-badge')).toBe(false);
      });
    });

    describe('isValidBadgeCategory', () => {
      it('should validate correct badge categories', () => {
        expect(isValidBadgeCategory('tasks')).toBe(true);
        expect(isValidBadgeCategory('commits')).toBe(true);
        expect(isValidBadgeCategory('goals')).toBe(true);
        expect(isValidBadgeCategory('habits')).toBe(true);
        expect(isValidBadgeCategory('time')).toBe(true);
        expect(isValidBadgeCategory('special')).toBe(true);
      });

      it('should reject invalid badge categories', () => {
        expect(isValidBadgeCategory('invalid')).toBe(false);
        expect(isValidBadgeCategory('projects')).toBe(false);
      });
    });

    describe('isValidBadgeRarity', () => {
      it('should validate correct badge rarities', () => {
        expect(isValidBadgeRarity('common')).toBe(true);
        expect(isValidBadgeRarity('rare')).toBe(true);
        expect(isValidBadgeRarity('epic')).toBe(true);
        expect(isValidBadgeRarity('legendary')).toBe(true);
      });

      it('should reject invalid badge rarities', () => {
        expect(isValidBadgeRarity('invalid')).toBe(false);
        expect(isValidBadgeRarity('mythic')).toBe(false);
      });
    });
  });

  describe('Activity validators', () => {
    describe('isValidActivityType', () => {
      it('should validate correct activity types', () => {
        expect(isValidActivityType('commit')).toBe(true);
        expect(isValidActivityType('task-completed')).toBe(true);
        expect(isValidActivityType('goal-achieved')).toBe(true);
        expect(isValidActivityType('pomodoro-completed')).toBe(true);
        expect(isValidActivityType('habit-completed')).toBe(true);
        expect(isValidActivityType('badge-unlocked')).toBe(true);
        expect(isValidActivityType('project-created')).toBe(true);
        expect(isValidActivityType('commits-grouped')).toBe(true);
      });

      it('should reject invalid activity types', () => {
        expect(isValidActivityType('invalid')).toBe(false);
        expect(isValidActivityType('task-created')).toBe(false);
      });
    });
  });

  describe('Generic validators', () => {
    describe('isValidObjectId', () => {
      it('should validate valid ObjectId', () => {
        const validId = new mongoose.Types.ObjectId();
        expect(isValidObjectId(validId.toString())).toBe(true);
      });

      it('should validate 24-char hex string', () => {
        expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      });

      it('should reject invalid ObjectId', () => {
        expect(isValidObjectId('invalid')).toBe(false);
        expect(isValidObjectId('123')).toBe(false);
      });

      it('should reject null', () => {
        expect(isValidObjectId(null)).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('test @example.com')).toBe(false);
      });

      it('should reject null', () => {
        expect(isValidEmail(null)).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
        expect(isValidUrl('https://example.com/path')).toBe(true);
        expect(isValidUrl('https://example.com:8080/path?query=value')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
      });

      it('should reject null', () => {
        expect(isValidUrl(null)).toBe(false);
      });
    });

    describe('isValidHexColor', () => {
      it('should validate 6-digit hex colors', () => {
        expect(isValidHexColor('#FF5733')).toBe(true);
        expect(isValidHexColor('#000000')).toBe(true);
        expect(isValidHexColor('#ffffff')).toBe(true);
      });

      it('should validate 3-digit hex colors', () => {
        expect(isValidHexColor('#F00')).toBe(true);
        expect(isValidHexColor('#abc')).toBe(true);
      });

      it('should reject invalid hex colors', () => {
        expect(isValidHexColor('FF5733')).toBe(false); // Missing #
        expect(isValidHexColor('#GG5733')).toBe(false); // Invalid chars
        expect(isValidHexColor('#FF57')).toBe(false); // Wrong length
      });

      it('should reject null', () => {
        expect(isValidHexColor(null)).toBe(false);
      });
    });

    describe('isPositiveNumber', () => {
      it('should validate positive numbers', () => {
        expect(isPositiveNumber(1)).toBe(true);
        expect(isPositiveNumber(100)).toBe(true);
        expect(isPositiveNumber(0.1)).toBe(true);
      });

      it('should reject zero', () => {
        expect(isPositiveNumber(0)).toBe(false);
      });

      it('should reject negative numbers', () => {
        expect(isPositiveNumber(-1)).toBe(false);
      });

      it('should reject non-numbers', () => {
        expect(isPositiveNumber('10')).toBe(false);
        expect(isPositiveNumber(null)).toBe(false);
      });

      it('should reject NaN', () => {
        expect(isPositiveNumber(NaN)).toBe(false);
      });
    });

    describe('isNonNegativeNumber', () => {
      it('should validate non-negative numbers', () => {
        expect(isNonNegativeNumber(0)).toBe(true);
        expect(isNonNegativeNumber(1)).toBe(true);
        expect(isNonNegativeNumber(100)).toBe(true);
      });

      it('should reject negative numbers', () => {
        expect(isNonNegativeNumber(-1)).toBe(false);
      });

      it('should reject non-numbers', () => {
        expect(isNonNegativeNumber('10')).toBe(false);
        expect(isNonNegativeNumber(null)).toBe(false);
      });

      it('should reject NaN', () => {
        expect(isNonNegativeNumber(NaN)).toBe(false);
      });
    });
  });
});
