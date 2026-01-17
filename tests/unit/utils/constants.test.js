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
  ACTIVITY_TYPE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  XP_REWARDS,
  USER_ROLE
} = require('../../../src/utils/constants');

describe('Constants', () => {
  describe('TASK_STATUS', () => {
    it('should have correct task statuses', () => {
      expect(TASK_STATUS.TODO).toBe('todo');
      expect(TASK_STATUS.IN_PROGRESS).toBe('in-progress');
      expect(TASK_STATUS.DONE).toBe('done');
    });
  });

  describe('TASK_PRIORITY', () => {
    it('should have correct task priorities', () => {
      expect(TASK_PRIORITY.LOW).toBe('low');
      expect(TASK_PRIORITY.NORMAL).toBe('normal');
      expect(TASK_PRIORITY.HIGH).toBe('high');
      expect(TASK_PRIORITY.CRITICAL).toBe('critical');
    });
  });

  describe('TASK_TYPE', () => {
    it('should have correct task types', () => {
      expect(TASK_TYPE.DEV).toBe('dev');
      expect(TASK_TYPE.PERSONAL).toBe('personal');
      expect(TASK_TYPE.GOAL).toBe('goal');
      expect(TASK_TYPE.HABIT).toBe('habit');
    });
  });

  describe('PROJECT_TYPE', () => {
    it('should have correct project types', () => {
      expect(PROJECT_TYPE.DEV).toBe('dev');
      expect(PROJECT_TYPE.PERSONAL).toBe('personal');
      expect(PROJECT_TYPE.BOOK).toBe('book');
    });
  });

  describe('PROJECT_STATUS', () => {
    it('should have correct project statuses', () => {
      expect(PROJECT_STATUS.ACTIVE).toBe('active');
      expect(PROJECT_STATUS.ON_HOLD).toBe('on-hold');
      expect(PROJECT_STATUS.COMPLETED).toBe('completed');
      expect(PROJECT_STATUS.ARCHIVED).toBe('archived');
    });
  });

  describe('GOAL_TYPE', () => {
    it('should have correct goal types', () => {
      expect(GOAL_TYPE.NUMERIC).toBe('numeric');
      expect(GOAL_TYPE.STEPS).toBe('steps');
      expect(GOAL_TYPE.SIMPLE).toBe('simple');
    });
  });

  describe('GOAL_LEVEL', () => {
    it('should have correct goal levels', () => {
      expect(GOAL_LEVEL.ANNUAL).toBe('annual');
      expect(GOAL_LEVEL.QUARTERLY).toBe('quarterly');
      expect(GOAL_LEVEL.MONTHLY).toBe('monthly');
      expect(GOAL_LEVEL.WEEKLY).toBe('weekly');
      expect(GOAL_LEVEL.DAILY).toBe('daily');
      expect(GOAL_LEVEL.NONE).toBe('none');
    });
  });

  describe('GOAL_CATEGORY', () => {
    it('should have correct goal categories', () => {
      expect(GOAL_CATEGORY.FINANCIAL).toBe('financial');
      expect(GOAL_CATEGORY.PROFESSIONAL).toBe('professional');
      expect(GOAL_CATEGORY.LEARNING).toBe('learning');
      expect(GOAL_CATEGORY.PERSONAL).toBe('personal');
      expect(GOAL_CATEGORY.HEALTH).toBe('health');
    });
  });

  describe('GOAL_STATUS', () => {
    it('should have correct goal statuses', () => {
      expect(GOAL_STATUS.NOT_STARTED).toBe('not-started');
      expect(GOAL_STATUS.ON_TRACK).toBe('on-track');
      expect(GOAL_STATUS.AT_RISK).toBe('at-risk');
      expect(GOAL_STATUS.BEHIND).toBe('behind');
      expect(GOAL_STATUS.COMPLETED).toBe('completed');
    });
  });

  describe('GOAL_PRIORITY', () => {
    it('should have correct goal priorities', () => {
      expect(GOAL_PRIORITY.LOW).toBe('low');
      expect(GOAL_PRIORITY.MEDIUM).toBe('medium');
      expect(GOAL_PRIORITY.HIGH).toBe('high');
      expect(GOAL_PRIORITY.CRITICAL).toBe('critical');
    });
  });

  describe('INTEGRATION_TYPE', () => {
    it('should have correct integration types', () => {
      expect(INTEGRATION_TYPE.NONE).toBe('none');
      expect(INTEGRATION_TYPE.COMMITS).toBe('commits');
      expect(INTEGRATION_TYPE.BOOKS).toBe('books');
      expect(INTEGRATION_TYPE.RISE_SAVINGS).toBe('rise_savings');
      expect(INTEGRATION_TYPE.RISE_EXPENSES).toBe('rise_expenses');
    });
  });

  describe('BADGE_TYPE', () => {
    it('should have first achievement badges', () => {
      expect(BADGE_TYPE.FIRST_TASK).toBe('first-task');
      expect(BADGE_TYPE.FIRST_COMMIT).toBe('first-commit');
      expect(BADGE_TYPE.FIRST_GOAL).toBe('first-goal');
    });

    it('should have task achievement badges', () => {
      expect(BADGE_TYPE.TASK_MASTER_10).toBe('task-master-10');
      expect(BADGE_TYPE.TASK_MASTER_50).toBe('task-master-50');
      expect(BADGE_TYPE.TASK_MASTER_100).toBe('task-master-100');
    });

    it('should have commit achievement badges', () => {
      expect(BADGE_TYPE.COMMIT_STREAK_7).toBe('commit-streak-7');
      expect(BADGE_TYPE.COMMIT_STREAK_30).toBe('commit-streak-30');
      expect(BADGE_TYPE.COMMIT_STREAK_100).toBe('commit-streak-100');
    });
  });

  describe('BADGE_CATEGORY', () => {
    it('should have correct badge categories', () => {
      expect(BADGE_CATEGORY.TASKS).toBe('tasks');
      expect(BADGE_CATEGORY.COMMITS).toBe('commits');
      expect(BADGE_CATEGORY.GOALS).toBe('goals');
      expect(BADGE_CATEGORY.HABITS).toBe('habits');
      expect(BADGE_CATEGORY.TIME).toBe('time');
      expect(BADGE_CATEGORY.SPECIAL).toBe('special');
    });
  });

  describe('BADGE_RARITY', () => {
    it('should have correct badge rarities', () => {
      expect(BADGE_RARITY.COMMON).toBe('common');
      expect(BADGE_RARITY.RARE).toBe('rare');
      expect(BADGE_RARITY.EPIC).toBe('epic');
      expect(BADGE_RARITY.LEGENDARY).toBe('legendary');
    });
  });

  describe('ACTIVITY_TYPE', () => {
    it('should have correct activity types', () => {
      expect(ACTIVITY_TYPE.COMMIT).toBe('commit');
      expect(ACTIVITY_TYPE.TASK_COMPLETED).toBe('task-completed');
      expect(ACTIVITY_TYPE.GOAL_ACHIEVED).toBe('goal-achieved');
      expect(ACTIVITY_TYPE.POMODORO_COMPLETED).toBe('pomodoro-completed');
      expect(ACTIVITY_TYPE.HABIT_COMPLETED).toBe('habit-completed');
      expect(ACTIVITY_TYPE.BADGE_UNLOCKED).toBe('badge-unlocked');
      expect(ACTIVITY_TYPE.PROJECT_CREATED).toBe('project-created');
      expect(ACTIVITY_TYPE.COMMITS_GROUPED).toBe('commits-grouped');
    });
  });

  describe('Pagination constants', () => {
    it('should have correct pagination values', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(50);
      expect(MAX_PAGE_SIZE).toBe(100);
    });
  });

  describe('XP_REWARDS', () => {
    it('should have task rewards', () => {
      expect(XP_REWARDS.TASK_COMPLETED).toBe(50);
      expect(XP_REWARDS.TASK_HIGH_PRIORITY).toBe(25);
      expect(XP_REWARDS.TASK_CRITICAL_PRIORITY).toBe(50);
    });

    it('should have goal rewards', () => {
      expect(XP_REWARDS.GOAL_COMPLETED).toBe(200);
      expect(XP_REWARDS.GOAL_MILESTONE).toBe(100);
    });

    it('should have activity rewards', () => {
      expect(XP_REWARDS.COMMIT).toBe(10);
      expect(XP_REWARDS.POMODORO_COMPLETED).toBe(25);
      expect(XP_REWARDS.HABIT_COMPLETED).toBe(30);
    });

    it('should have badge rewards', () => {
      expect(XP_REWARDS.BADGE_COMMON).toBe(50);
      expect(XP_REWARDS.BADGE_RARE).toBe(150);
      expect(XP_REWARDS.BADGE_EPIC).toBe(300);
      expect(XP_REWARDS.BADGE_LEGENDARY).toBe(500);
    });

    it('should have streak and review rewards', () => {
      expect(XP_REWARDS.DAILY_STREAK).toBe(20);
      expect(XP_REWARDS.WEEKLY_REVIEW).toBe(100);
    });
  });

  describe('USER_ROLE', () => {
    it('should have correct user roles', () => {
      expect(USER_ROLE.USER).toBe('user');
      expect(USER_ROLE.ADMIN).toBe('admin');
    });
  });
});
