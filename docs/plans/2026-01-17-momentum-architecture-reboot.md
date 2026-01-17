# Momentum Architecture Reboot - Professional Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Momentum backend into a professional, maintainable architecture with service layer, proper validation, transactions, and complete API coverage for all wireframe modules.

**Architecture:** Implement clean layered architecture (Routes → Controllers → Services → Models) with separation of concerns, comprehensive input validation using express-validator, MongoDB transactions for multi-document operations, and background job processing with Bull. Split the monolithic Goal model into focused models and extract all business logic into services.

**Tech Stack:** Node.js, Express 5, Mongoose 9, JWT, Socket.IO, Bull (job queue), express-validator, Jest + Supertest (testing)

---

## Phase 1: Foundation & Infrastructure

### Task 1: Setup Testing Infrastructure

**Files:**
- Create: `tests/setup.js`
- Create: `tests/helpers/testDb.js`
- Create: `tests/helpers/fixtures.js`
- Modify: `package.json`
- Create: `jest.config.js`

**Step 1: Install testing dependencies**

```bash
npm install --save-dev jest supertest mongodb-memory-server @types/jest
```

Expected: Dependencies added to package.json

**Step 2: Create Jest configuration**

Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
```

**Step 3: Create test setup file**

Create `tests/setup.js`:

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
```

**Step 4: Create test database helper**

Create `tests/helpers/testDb.js`:

```javascript
const User = require('../../src/models/User.model');
const Project = require('../../src/models/Project.model');
const Task = require('../../src/models/Task.model');

const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    ...overrides
  };
  return await User.create(defaultUser);
};

const createTestProject = async (userId, overrides = {}) => {
  const defaultProject = {
    name: 'Test Project',
    type: 'dev',
    user: userId,
    ...overrides
  };
  return await Project.create(defaultProject);
};

const createTestTask = async (userId, projectId, overrides = {}) => {
  const defaultTask = {
    title: 'Test Task',
    user: userId,
    project: projectId,
    status: 'todo',
    priority: 'normal',
    ...overrides
  };
  return await Task.create(defaultTask);
};

module.exports = {
  createTestUser,
  createTestProject,
  createTestTask
};
```

**Step 5: Create fixtures helper**

Create `tests/helpers/fixtures.js`:

```javascript
const jwt = require('jsonwebtoken');

const generateAuthToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

const validTaskPayload = {
  title: 'New Task',
  description: 'Task description',
  priority: 'high',
  status: 'todo',
  type: 'dev'
};

const validProjectPayload = {
  name: 'New Project',
  type: 'dev',
  status: 'active',
  color: '#4E8EA2',
  icon: '💻'
};

const validGoalPayload = {
  title: '500 commits in 2026',
  type: 'numeric',
  category: 'professional',
  target_value: 500,
  unit: 'commits',
  level: 'annual',
  year: 2026
};

module.exports = {
  generateAuthToken,
  validTaskPayload,
  validProjectPayload,
  validGoalPayload
};
```

**Step 6: Update package.json scripts**

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration"
  }
}
```

**Step 7: Run tests to verify setup**

```bash
npm test
```

Expected: "No tests found" (infrastructure ready)

**Step 8: Commit**

```bash
git add jest.config.js tests/ package.json package-lock.json
git commit -m "test: setup Jest testing infrastructure with MongoDB memory server"
```

---

### Task 2: Create Utils Layer

**Files:**
- Create: `src/utils/constants.js`
- Create: `src/utils/date.js`
- Create: `src/utils/formatters.js`
- Create: `src/utils/validators.js`
- Create: `tests/unit/utils/date.test.js`

**Step 1: Write test for date utilities**

Create `tests/unit/utils/date.test.js`:

```javascript
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
  });

  describe('getWeekDates', () => {
    it('should return start and end dates for week', () => {
      const { start, end } = getWeekDates(2026, 3);
      expect(start.getDay()).toBe(1); // Monday
      expect(end.getDay()).toBe(0); // Sunday
    });
  });

  describe('getDayOfYear', () => {
    it('should return correct day of year', () => {
      const date = new Date('2026-01-17');
      const day = getDayOfYear(date);
      expect(day).toBe(17);
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
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/utils/date.test.js
```

Expected: FAIL - "Cannot find module '../../../src/utils/date'"

**Step 3: Implement date utilities**

Create `src/utils/date.js`:

```javascript
/**
 * Get ISO week number for a given date
 * @param {Date} date
 * @returns {number} Week number (1-53)
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Get start and end dates for a given week
 * @param {number} year
 * @param {number} week
 * @returns {{start: Date, end: Date}}
 */
const getWeekDates = (year, week) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

  const start = new Date(ISOweekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
};

/**
 * Get day of year (1-366)
 * @param {Date} date
 * @returns {number}
 */
const getDayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

/**
 * Format timestamp as relative time in French
 * @param {Date} date
 * @returns {string} e.g., "Il y a 2 heures"
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

  return date.toLocaleDateString('fr-FR');
};

module.exports = {
  getWeekNumber,
  getWeekDates,
  getDayOfYear,
  formatRelativeTime
};
```

**Step 4: Run test to verify it passes**

```bash
npm test tests/unit/utils/date.test.js
```

Expected: PASS

**Step 5: Create constants file**

Create `src/utils/constants.js`:

```javascript
// Task constants
const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done'
};

const TASK_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const TASK_TYPE = {
  DEV: 'dev',
  PERSONAL: 'personal',
  GOAL: 'goal',
  HABIT: 'habit'
};

// Project constants
const PROJECT_TYPE = {
  DEV: 'dev',
  PERSONAL: 'personal',
  BOOK: 'book'
};

const PROJECT_STATUS = {
  ACTIVE: 'active',
  ON_HOLD: 'on-hold',
  COMPLETED: 'completed'
};

// Goal constants
const GOAL_TYPE = {
  NUMERIC: 'numeric',
  STEPS: 'steps',
  SIMPLE: 'simple'
};

const GOAL_LEVEL = {
  ANNUAL: 'annual',
  QUARTERLY: 'quarterly',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  DAILY: 'daily',
  NONE: 'none'
};

const GOAL_CATEGORY = {
  FINANCIAL: 'financial',
  PROFESSIONAL: 'professional',
  LEARNING: 'learning',
  PERSONAL: 'personal',
  HEALTH: 'health'
};

const GOAL_STATUS = {
  ON_TRACK: 'on-track',
  AT_RISK: 'at-risk',
  BEHIND: 'behind',
  COMPLETED: 'completed'
};

const INTEGRATION_TYPE = {
  COMMITS: 'commits',
  BOOKS: 'books',
  RISE_SAVINGS: 'rise_savings',
  RISE_EXPENSES: 'rise_expenses'
};

// Badge types
const BADGE_TYPE = {
  TASK_MASTER_10: 'task-master-10',
  TASK_MASTER_50: 'task-master-50',
  COMMIT_STREAK_7: 'commit-streak-7',
  COMMIT_STREAK_30: 'commit-streak-30',
  GOAL_ACHIEVER: 'goal-achiever',
  PRODUCTIVITY_CHAMPION: 'productivity-champion'
};

// Pagination
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// XP rewards
const XP_REWARDS = {
  TASK_COMPLETED: 50,
  GOAL_COMPLETED: 200,
  HABIT_COMPLETED: 30,
  COMMIT: 10,
  STREAK_BONUS: 20,
  BADGE_UNLOCKED: 100
};

module.exports = {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
  PROJECT_TYPE,
  PROJECT_STATUS,
  GOAL_TYPE,
  GOAL_LEVEL,
  GOAL_CATEGORY,
  GOAL_STATUS,
  INTEGRATION_TYPE,
  BADGE_TYPE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  XP_REWARDS
};
```

**Step 6: Create formatters**

Create `src/utils/formatters.js`:

```javascript
/**
 * Format progress percentage
 * @param {number} current
 * @param {number} target
 * @returns {number} Percentage (0-100)
 */
const formatProgress = (current, target) => {
  if (!target || target === 0) return 0;
  const percentage = (current / target) * 100;
  return Math.min(Math.round(percentage), 100);
};

/**
 * Format change percentage with sign
 * @param {number} current
 * @param {number} previous
 * @returns {string} e.g., "+18%"
 */
const formatChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
};

/**
 * Format trend direction
 * @param {number} current
 * @param {number} previous
 * @returns {'up'|'down'|'stable'}
 */
const formatTrend = (current, previous) => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
};

/**
 * Sanitize HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
const sanitizeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

module.exports = {
  formatProgress,
  formatChange,
  formatTrend,
  sanitizeHtml
};
```

**Step 7: Create custom validators**

Create `src/utils/validators.js`:

```javascript
const { TASK_PRIORITY, TASK_STATUS, PROJECT_TYPE, GOAL_TYPE } = require('./constants');

/**
 * Validate if value is in allowed enum
 */
const isValidEnum = (value, enumObject) => {
  return Object.values(enumObject).includes(value);
};

/**
 * Validate task priority
 */
const isValidTaskPriority = (value) => {
  return isValidEnum(value, TASK_PRIORITY);
};

/**
 * Validate task status
 */
const isValidTaskStatus = (value) => {
  return isValidEnum(value, TASK_STATUS);
};

/**
 * Validate project type
 */
const isValidProjectType = (value) => {
  return isValidEnum(value, PROJECT_TYPE);
};

/**
 * Validate goal type
 */
const isValidGoalType = (value) => {
  return isValidEnum(value, GOAL_TYPE);
};

/**
 * Validate MongoDB ObjectId format
 */
const isValidObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

module.exports = {
  isValidEnum,
  isValidTaskPriority,
  isValidTaskStatus,
  isValidProjectType,
  isValidGoalType,
  isValidObjectId
};
```

**Step 8: Commit**

```bash
git add src/utils/ tests/unit/utils/
git commit -m "feat: add utils layer with date, formatters, constants, validators"
```

---

### Task 3: Create Validation Middleware Layer

**Files:**
- Create: `src/validators/task.validator.js`
- Create: `src/validators/project.validator.js`
- Create: `src/validators/goal.validator.js`
- Create: `src/validators/auth.validator.js`
- Create: `src/middleware/validation.js`
- Create: `tests/unit/middleware/validation.test.js`

**Step 1: Write test for validation middleware**

Create `tests/unit/middleware/validation.test.js`:

```javascript
const { validationResult } = require('express-validator');
const { handleValidationErrors } = require('../../../src/middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next if no validation errors', () => {
    req.validationErrors = jest.fn().mockReturnValue({ isEmpty: () => true });

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with errors if validation fails', () => {
    const mockErrors = {
      isEmpty: () => false,
      array: () => [
        { param: 'title', msg: 'Title is required' }
      ]
    };

    validationResult.mockReturnValue(mockErrors);

    handleValidationErrors(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: expect.any(Array)
    });
    expect(next).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/middleware/validation.test.js
```

Expected: FAIL - "Cannot find module"

**Step 3: Create validation middleware**

Create `src/middleware/validation.js`:

```javascript
const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

module.exports = {
  handleValidationErrors
};
```

**Step 4: Run test to verify it passes**

```bash
npm test tests/unit/middleware/validation.test.js
```

Expected: PASS

**Step 5: Create task validators**

Create `src/validators/task.validator.js`:

```javascript
const { check, param } = require('express-validator');
const { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } = require('../utils/constants');
const { handleValidationErrors } = require('../middleware/validation');

const createTaskValidator = [
  check('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),

  check('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),

  check('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY)).withMessage(`Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`),

  check('status')
    .optional()
    .isIn(Object.values(TASK_STATUS)).withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`),

  check('type')
    .optional()
    .isIn(Object.values(TASK_TYPE)).withMessage(`Type must be one of: ${Object.values(TASK_TYPE).join(', ')}`),

  check('deadline')
    .optional()
    .isISO8601().withMessage('Deadline must be a valid ISO 8601 date'),

  check('estimatedTime')
    .optional()
    .isInt({ min: 0 }).withMessage('Estimated time must be a positive integer (minutes)'),

  check('project')
    .optional()
    .isMongoId().withMessage('Project must be a valid MongoDB ObjectId'),

  check('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),

  handleValidationErrors
];

const updateTaskValidator = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),

  check('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),

  check('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),

  check('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY)).withMessage(`Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`),

  check('status')
    .optional()
    .isIn(Object.values(TASK_STATUS)).withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`),

  handleValidationErrors
];

const taskIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),

  handleValidationErrors
];

const updateTaskStatusValidator = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),

  check('status')
    .notEmpty().withMessage('Status is required')
    .isIn(Object.values(TASK_STATUS)).withMessage(`Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`),

  handleValidationErrors
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  taskIdValidator,
  updateTaskStatusValidator
};
```

**Step 6: Create project validators**

Create `src/validators/project.validator.js`:

```javascript
const { check, param } = require('express-validator');
const { PROJECT_TYPE, PROJECT_STATUS } = require('../utils/constants');
const { handleValidationErrors } = require('../middleware/validation');

const createProjectValidator = [
  check('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),

  check('type')
    .notEmpty().withMessage('Project type is required')
    .isIn(Object.values(PROJECT_TYPE)).withMessage(`Type must be one of: ${Object.values(PROJECT_TYPE).join(', ')}`),

  check('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS)).withMessage(`Status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`),

  check('icon')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Icon must not exceed 10 characters'),

  check('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color (e.g., #4E8EA2)'),

  check('book_pages')
    .optional()
    .isInt({ min: 0 }).withMessage('Book pages must be a positive integer'),

  check('book_author')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Author name must not exceed 200 characters'),

  handleValidationErrors
];

const updateProjectValidator = [
  param('id')
    .isMongoId().withMessage('Invalid project ID'),

  check('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),

  check('type')
    .optional()
    .isIn(Object.values(PROJECT_TYPE)).withMessage(`Type must be one of: ${Object.values(PROJECT_TYPE).join(', ')}`),

  check('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS)).withMessage(`Status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`),

  handleValidationErrors
];

const projectIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid project ID'),

  handleValidationErrors
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  projectIdValidator
};
```

**Step 7: Create goal validators**

Create `src/validators/goal.validator.js`:

```javascript
const { check, param } = require('express-validator');
const { GOAL_TYPE, GOAL_LEVEL, GOAL_CATEGORY } = require('../utils/constants');
const { handleValidationErrors } = require('../middleware/validation');

const createGoalValidator = [
  check('title')
    .trim()
    .notEmpty().withMessage('Goal title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),

  check('type')
    .notEmpty().withMessage('Goal type is required')
    .isIn(Object.values(GOAL_TYPE)).withMessage(`Type must be one of: ${Object.values(GOAL_TYPE).join(', ')}`),

  check('category')
    .notEmpty().withMessage('Category is required')
    .isIn(Object.values(GOAL_CATEGORY)).withMessage(`Category must be one of: ${Object.values(GOAL_CATEGORY).join(', ')}`),

  check('level')
    .optional()
    .isIn(Object.values(GOAL_LEVEL)).withMessage(`Level must be one of: ${Object.values(GOAL_LEVEL).join(', ')}`),

  check('target_value')
    .if(check('type').equals('numeric'))
    .notEmpty().withMessage('Target value is required for numeric goals')
    .isInt({ min: 1 }).withMessage('Target value must be a positive integer'),

  check('unit')
    .if(check('type').equals('numeric'))
    .notEmpty().withMessage('Unit is required for numeric goals')
    .trim(),

  check('total_steps')
    .if(check('type').equals('steps'))
    .notEmpty().withMessage('Total steps is required for steps goals')
    .isInt({ min: 1 }).withMessage('Total steps must be a positive integer'),

  check('year')
    .if(check('level').equals('annual'))
    .notEmpty().withMessage('Year is required for annual goals')
    .isInt({ min: 2020, max: 2100 }).withMessage('Year must be between 2020 and 2100'),

  handleValidationErrors
];

const updateGoalProgressValidator = [
  param('id')
    .isMongoId().withMessage('Invalid goal ID'),

  check('current_value')
    .notEmpty().withMessage('Current value is required')
    .isNumeric().withMessage('Current value must be a number'),

  handleValidationErrors
];

const goalIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid goal ID'),

  handleValidationErrors
];

const quarterValidator = [
  param('quarter')
    .isInt({ min: 1, max: 4 }).withMessage('Quarter must be between 1 and 4'),

  handleValidationErrors
];

const monthValidator = [
  param('month')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),

  handleValidationErrors
];

const weekValidator = [
  param('week')
    .isInt({ min: 1, max: 53 }).withMessage('Week must be between 1 and 53'),

  handleValidationErrors
];

module.exports = {
  createGoalValidator,
  updateGoalProgressValidator,
  goalIdValidator,
  quarterValidator,
  monthValidator,
  weekValidator
};
```

**Step 8: Create auth validators**

Create `src/validators/auth.validator.js`:

```javascript
const { check } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const registerValidator = [
  check('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  handleValidationErrors
];

const loginValidator = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  check('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors
];

const updateDetailsValidator = [
  check('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  check('email')
    .optional()
    .trim()
    .notEmpty().withMessage('Email cannot be empty')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  handleValidationErrors
];

const updatePasswordValidator = [
  check('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  check('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),

  handleValidationErrors
];

module.exports = {
  registerValidator,
  loginValidator,
  updateDetailsValidator,
  updatePasswordValidator
};
```

**Step 9: Commit**

```bash
git add src/validators/ src/middleware/validation.js tests/unit/middleware/
git commit -m "feat: add comprehensive validation layer with express-validator"
```

---

## Phase 2: Service Layer Architecture

### Task 4: Create Base Service Class

**Files:**
- Create: `src/services/BaseService.js`
- Create: `tests/unit/services/BaseService.test.js`

**Step 1: Write test for base service**

Create `tests/unit/services/BaseService.test.js`:

```javascript
const BaseService = require('../../../src/services/BaseService');
const User = require('../../../src/models/User.model');

class TestService extends BaseService {
  constructor() {
    super(User);
  }
}

describe('BaseService', () => {
  let service;

  beforeEach(() => {
    service = new TestService();
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const user = await User.create({
        name: 'Test',
        email: 'test@test.com',
        password: 'password123'
      });

      const found = await service.findById(user._id);

      expect(found).toBeDefined();
      expect(found.name).toBe('Test');
    });

    it('should return null for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const found = await service.findById(fakeId);

      expect(found).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new document', async () => {
      const data = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password123'
      };

      const created = await service.create(data);

      expect(created).toBeDefined();
      expect(created.name).toBe('New User');
    });
  });

  describe('update', () => {
    it('should update existing document', async () => {
      const user = await User.create({
        name: 'Original',
        email: 'original@test.com',
        password: 'password123'
      });

      const updated = await service.update(user._id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      const user = await User.create({
        name: 'To Delete',
        email: 'delete@test.com',
        password: 'password123'
      });

      await service.delete(user._id);

      const found = await User.findById(user._id);
      expect(found).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/services/BaseService.test.js
```

Expected: FAIL - "Cannot find module"

**Step 3: Implement base service**

Create `src/services/BaseService.js`:

```javascript
/**
 * Base service class with common CRUD operations
 * All services should extend this class
 */
class BaseService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Find document by ID
   * @param {string} id - MongoDB ObjectId
   * @param {Object} options - Query options (populate, select, etc.)
   * @returns {Promise<Object|null>}
   */
  async findById(id, options = {}) {
    try {
      let query = this.model.findById(id);

      if (options.populate) {
        query = query.populate(options.populate);
      }

      if (options.select) {
        query = query.select(options.select);
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`Error finding document: ${error.message}`);
    }
  }

  /**
   * Find all documents with optional filters
   * @param {Object} filter - MongoDB filter object
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sort = { createdAt: -1 },
        populate = null,
        select = null
      } = options;

      let query = this.model.find(filter);

      if (populate) {
        query = query.populate(populate);
      }

      if (select) {
        query = query.select(select);
      }

      query = query
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      return await query.exec();
    } catch (error) {
      throw new Error(`Error finding documents: ${error.message}`);
    }
  }

  /**
   * Create new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      return await this.model.create(data);
    } catch (error) {
      throw new Error(`Error creating document: ${error.message}`);
    }
  }

  /**
   * Update document by ID
   * @param {string} id - MongoDB ObjectId
   * @param {Object} updates - Update data
   * @returns {Promise<Object|null>}
   */
  async update(id, updates) {
    try {
      return await this.model.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  /**
   * Delete document by ID
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>}
   */
  async delete(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  }

  /**
   * Count documents matching filter
   * @param {Object} filter - MongoDB filter object
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw new Error(`Error counting documents: ${error.message}`);
    }
  }

  /**
   * Check if document exists
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    try {
      const doc = await this.model.findById(id).select('_id').lean();
      return !!doc;
    } catch (error) {
      return false;
    }
  }
}

module.exports = BaseService;
```

**Step 4: Run test to verify it passes**

```bash
npm test tests/unit/services/BaseService.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/BaseService.js tests/unit/services/BaseService.test.js
git commit -m "feat: add base service class with common CRUD operations"
```

---

### Task 5: Fix Commit Tracking - Remove Dual System

**Files:**
- Modify: `src/models/Task.model.js`
- Create: `src/migrations/001-remove-task-git-commits.js`
- Create: `tests/integration/migrations/001.test.js`

**Step 1: Write migration test**

Create `tests/integration/migrations/001.test.js`:

```javascript
const mongoose = require('mongoose');
const Task = require('../../../src/models/Task.model');
const { createTestUser, createTestProject } = require('../../helpers/testDb');

describe('Migration 001: Remove Task gitCommits', () => {
  it('should remove gitCommits field from existing tasks', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task with old schema (directly insert)
    const taskData = {
      title: 'Old Task',
      user: user._id,
      project: project._id,
      gitCommits: [
        { message: 'feat: test', timestamp: new Date(), hash: 'abc123' }
      ]
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Verify old field exists
    const oldTask = await collection.findOne({ _id: result.insertedId });
    expect(oldTask.gitCommits).toBeDefined();
    expect(oldTask.gitCommits.length).toBe(1);

    // Run migration
    const migration = require('../../../src/migrations/001-remove-task-git-commits');
    await migration.up();

    // Verify field removed
    const migratedTask = await collection.findOne({ _id: result.insertedId });
    expect(migratedTask.gitCommits).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/migrations/001.test.js
```

Expected: FAIL - "Cannot find module migration"

**Step 3: Create migration script**

Create `src/migrations/001-remove-task-git-commits.js`:

```javascript
const mongoose = require('mongoose');

/**
 * Migration: Remove gitCommits embedded array from Task model
 * Reason: Using separate Commit model for better data integrity
 */
const up = async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('tasks');

  console.log('Starting migration: Remove Task.gitCommits...');

  // Remove gitCommits field from all tasks
  const result = await collection.updateMany(
    { gitCommits: { $exists: true } },
    { $unset: { gitCommits: "" } }
  );

  console.log(`Migration complete: ${result.modifiedCount} tasks updated`);
  return result;
};

/**
 * Rollback migration (not recommended, data will be lost)
 */
const down = async () => {
  console.log('Warning: Cannot restore deleted gitCommits data');
  console.log('This migration is not reversible without backup');
  return { acknowledged: true, modifiedCount: 0 };
};

module.exports = { up, down };
```

**Step 4: Remove gitCommits from Task model**

Edit `src/models/Task.model.js`:

Find and remove this section:
```javascript
gitCommits: [
  {
    message: String,
    timestamp: Date,
    hash: String,
    author: String,
    url: String
  }
],
```

**Step 5: Run migration**

```bash
node -e "require('./src/config/database').connectDB().then(() => require('./src/migrations/001-remove-task-git-commits').up()).then(() => process.exit(0))"
```

**Step 6: Run test to verify it passes**

```bash
npm test tests/integration/migrations/001.test.js
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/models/Task.model.js src/migrations/ tests/integration/migrations/
git commit -m "fix: remove dual commit tracking, use only Commit model"
```

---

## Phase 3: Refactor Goal Model

### Task 6: Split Goal Model into Focused Models

**Files:**
- Create: `src/models/GoalBase.model.js`
- Create: `src/models/GoalHierarchy.model.js`
- Create: `src/models/GoalIntegration.model.js`
- Modify: `src/models/Goal.model.js` (keep for backward compatibility, delegate to new models)
- Create: `tests/unit/models/GoalBase.test.js`

**Step 1: Write test for GoalBase model**

Create `tests/unit/models/GoalBase.test.js`:

```javascript
const GoalBase = require('../../../src/models/GoalBase.model');
const { createTestUser } = require('../../helpers/testDb');

describe('GoalBase Model', () => {
  it('should create a numeric goal', async () => {
    const user = await createTestUser();

    const goal = await GoalBase.create({
      title: '500 commits',
      type: 'numeric',
      category: 'professional',
      target_value: 500,
      unit: 'commits',
      user: user._id
    });

    expect(goal).toBeDefined();
    expect(goal.type).toBe('numeric');
    expect(goal.target_value).toBe(500);
    expect(goal.current_value).toBe(0);
  });

  it('should calculate progress correctly', async () => {
    const user = await createTestUser();

    const goal = await GoalBase.create({
      title: '100 pages',
      type: 'numeric',
      category: 'learning',
      target_value: 100,
      unit: 'pages',
      current_value: 25,
      user: user._id
    });

    const progress = goal.calculateProgress();
    expect(progress).toBe(25);
  });

  it('should create a steps goal', async () => {
    const user = await createTestUser();

    const goal = await GoalBase.create({
      title: 'Read 12 books',
      type: 'steps',
      category: 'learning',
      total_steps: 12,
      user: user._id,
      steps: [
        { title: 'Atomic Habits', completed: false },
        { title: 'Deep Work', completed: false }
      ]
    });

    expect(goal.type).toBe('steps');
    expect(goal.total_steps).toBe(12);
    expect(goal.steps.length).toBe(2);
  });

  it('should calculate status based on progress', async () => {
    const user = await createTestUser();

    const goal = await GoalBase.create({
      title: 'Test Goal',
      type: 'numeric',
      category: 'professional',
      target_value: 100,
      current_value: 90,
      user: user._id
    });

    const status = goal.calculateStatus();
    expect(status).toBe('on-track');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/models/GoalBase.test.js
```

Expected: FAIL - "Cannot find module GoalBase"

**Step 3: Create GoalBase model**

Create `src/models/GoalBase.model.js`:

```javascript
const mongoose = require('mongoose');
const { GOAL_TYPE, GOAL_CATEGORY, GOAL_STATUS } = require('../utils/constants');

const stepSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date
});

const goalBaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    title: {
      type: String,
      required: [true, 'Please add a goal title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    type: {
      type: String,
      enum: Object.values(GOAL_TYPE),
      required: true
    },

    category: {
      type: String,
      enum: Object.values(GOAL_CATEGORY),
      required: true
    },

    // For numeric goals
    target_value: {
      type: Number,
      min: 0
    },

    current_value: {
      type: Number,
      default: 0,
      min: 0
    },

    unit: {
      type: String,
      trim: true
    },

    // For steps goals
    total_steps: {
      type: Number,
      min: 1
    },

    steps: [stepSchema],

    // Progress tracking
    progress_percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    status: {
      type: String,
      enum: Object.values(GOAL_STATUS),
      default: 'on-track'
    },

    // Personal goals
    is_personal: {
      type: Boolean,
      default: false
    },

    personal_duration_type: {
      type: String,
      enum: ['indefinite', 'this_quarter', 'this_month'],
      default: 'indefinite'
    },

    // Links
    linked_projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    }],

    linked_tasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }],

    // Timestamps
    startDate: Date,
    endDate: Date,
    completedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
goalBaseSchema.index({ user: 1, type: 1 });
goalBaseSchema.index({ user: 1, category: 1 });
goalBaseSchema.index({ user: 1, status: 1 });
goalBaseSchema.index({ user: 1, is_personal: 1 });

// Instance methods
goalBaseSchema.methods.calculateProgress = function() {
  if (this.type === 'numeric' && this.target_value > 0) {
    const progress = (this.current_value / this.target_value) * 100;
    return Math.min(Math.round(progress), 100);
  }

  if (this.type === 'steps' && this.total_steps > 0) {
    const completed = this.steps.filter(s => s.completed).length;
    const progress = (completed / this.total_steps) * 100;
    return Math.min(Math.round(progress), 100);
  }

  return 0;
};

goalBaseSchema.methods.calculateStatus = function() {
  const progress = this.calculateProgress();

  if (progress >= 100) return 'completed';
  if (progress >= 75) return 'on-track';
  if (progress >= 50) return 'at-risk';
  return 'behind';
};

goalBaseSchema.methods.updateProgressAndStatus = function() {
  this.progress_percent = this.calculateProgress();
  this.status = this.calculateStatus();

  if (this.progress_percent >= 100 && !this.completedAt) {
    this.completedAt = new Date();
  }
};

// Pre-save hook
goalBaseSchema.pre('save', function(next) {
  this.updateProgressAndStatus();
  next();
});

module.exports = mongoose.model('GoalBase', goalBaseSchema);
```

**Step 4: Run test to verify it passes**

```bash
npm test tests/unit/models/GoalBase.test.js
```

Expected: PASS

**Step 5: Create GoalHierarchy model**

Create `src/models/GoalHierarchy.model.js`:

```javascript
const mongoose = require('mongoose');
const { GOAL_LEVEL } = require('../utils/constants');

const goalHierarchySchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalBase',
      required: true,
      unique: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    level: {
      type: String,
      enum: Object.values(GOAL_LEVEL),
      required: true
    },

    // Temporal metadata
    year: Number,
    quarter: {
      type: Number,
      min: 1,
      max: 4
    },
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    week: {
      type: Number,
      min: 1,
      max: 53
    },
    day_of_year: {
      type: Number,
      min: 1,
      max: 366
    },

    // Hierarchy relationships
    parent_goal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalBase'
    },

    parent_annual_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalBase'
    },

    children_goal_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalBase'
    }],

    // Display control
    display_in_hierarchy: {
      type: Boolean,
      default: true
    },

    display_in_checklist: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
goalHierarchySchema.index({ user: 1, level: 1 });
goalHierarchySchema.index({ user: 1, year: 1 });
goalHierarchySchema.index({ user: 1, year: 1, quarter: 1 });
goalHierarchySchema.index({ user: 1, year: 1, month: 1 });
goalHierarchySchema.index({ user: 1, year: 1, week: 1 });
goalHierarchySchema.index({ parent_annual_id: 1 });
goalHierarchySchema.index({ parent_goal_id: 1 });

module.exports = mongoose.model('GoalHierarchy', goalHierarchySchema);
```

**Step 6: Create GoalIntegration model**

Create `src/models/GoalIntegration.model.js`:

```javascript
const mongoose = require('mongoose');
const { INTEGRATION_TYPE } = require('../utils/constants');

const goalIntegrationSchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalBase',
      required: true,
      unique: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    integration_type: {
      type: String,
      enum: Object.values(INTEGRATION_TYPE),
      required: true
    },

    // Auto-sync configuration
    auto_sync_enabled: {
      type: Boolean,
      default: true
    },

    last_synced_at: Date,

    sync_frequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily'],
      default: 'realtime'
    },

    // Integration-specific config
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Sync history (last 10 syncs)
    sync_history: [{
      timestamp: Date,
      items_synced: Number,
      status: {
        type: String,
        enum: ['success', 'partial', 'failed']
      },
      error_message: String
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
goalIntegrationSchema.index({ user: 1, integration_type: 1 });
goalIntegrationSchema.index({ auto_sync_enabled: 1 });

// Instance methods
goalIntegrationSchema.methods.recordSync = function(itemsSynced, status, errorMessage = null) {
  this.sync_history.unshift({
    timestamp: new Date(),
    items_synced: itemsSynced,
    status,
    error_message: errorMessage
  });

  // Keep only last 10 syncs
  this.sync_history = this.sync_history.slice(0, 10);

  this.last_synced_at = new Date();
};

module.exports = mongoose.model('GoalIntegration', goalIntegrationSchema);
```

**Step 7: Commit**

```bash
git add src/models/GoalBase.model.js src/models/GoalHierarchy.model.js src/models/GoalIntegration.model.js tests/unit/models/GoalBase.test.js
git commit -m "refactor: split Goal model into GoalBase, GoalHierarchy, GoalIntegration"
```

---

### Task 7: Create Goal Services

**Files:**
- Create: `src/services/goal.service.js`
- Create: `src/services/goalHierarchy.service.js`
- Create: `src/services/goalIntegration.service.js`
- Create: `tests/unit/services/goal.service.test.js`

**Step 1: Write test for goal service**

Create `tests/unit/services/goal.service.test.js`:

```javascript
const GoalService = require('../../../src/services/goal.service');
const { createTestUser } = require('../../helpers/testDb');
const GoalBase = require('../../../src/models/GoalBase.model');

describe('GoalService', () => {
  let goalService;
  let user;

  beforeEach(async () => {
    goalService = new GoalService();
    user = await createTestUser();
  });

  describe('createGoal', () => {
    it('should create a numeric goal', async () => {
      const goalData = {
        title: '500 commits',
        type: 'numeric',
        category: 'professional',
        target_value: 500,
        unit: 'commits'
      };

      const goal = await goalService.createGoal(user._id, goalData);

      expect(goal).toBeDefined();
      expect(goal.title).toBe('500 commits');
      expect(goal.type).toBe('numeric');
      expect(goal.user.toString()).toBe(user._id.toString());
    });

    it('should create a steps goal', async () => {
      const goalData = {
        title: 'Read 12 books',
        type: 'steps',
        category: 'learning',
        total_steps: 12,
        steps: [
          { title: 'Book 1' },
          { title: 'Book 2' }
        ]
      };

      const goal = await goalService.createGoal(user._id, goalData);

      expect(goal.type).toBe('steps');
      expect(goal.total_steps).toBe(12);
      expect(goal.steps.length).toBe(2);
    });
  });

  describe('updateProgress', () => {
    it('should update goal progress and recalculate status', async () => {
      const goal = await GoalBase.create({
        title: 'Test Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        current_value: 0,
        user: user._id
      });

      const updated = await goalService.updateProgress(goal._id, 50);

      expect(updated.current_value).toBe(50);
      expect(updated.progress_percent).toBe(50);
    });
  });

  describe('completeStep', () => {
    it('should mark step as completed', async () => {
      const goal = await GoalBase.create({
        title: 'Read books',
        type: 'steps',
        category: 'learning',
        total_steps: 3,
        user: user._id,
        steps: [
          { title: 'Book 1', completed: false },
          { title: 'Book 2', completed: false }
        ]
      });

      const stepId = goal.steps[0]._id;
      const updated = await goalService.completeStep(goal._id, stepId);

      expect(updated.steps[0].completed).toBe(true);
      expect(updated.steps[0].completedAt).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/services/goal.service.test.js
```

Expected: FAIL - "Cannot find module goal.service"

**Step 3: Implement goal service**

Create `src/services/goal.service.js`:

```javascript
const BaseService = require('./BaseService');
const GoalBase = require('../models/GoalBase.model');
const GoalIntegration = require('../models/GoalIntegration.model');

class GoalService extends BaseService {
  constructor() {
    super(GoalBase);
  }

  /**
   * Create a new goal
   * @param {string} userId
   * @param {Object} goalData
   * @returns {Promise<Object>}
   */
  async createGoal(userId, goalData) {
    const goal = await this.create({
      ...goalData,
      user: userId
    });

    // If integration type specified, create integration record
    if (goalData.integration_type) {
      await GoalIntegration.create({
        goal: goal._id,
        user: userId,
        integration_type: goalData.integration_type,
        auto_sync_enabled: true
      });
    }

    return goal;
  }

  /**
   * Get all goals for user with filters
   * @param {string} userId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getUserGoals(userId, filters = {}) {
    const query = { user: userId, ...filters };
    return await this.findAll(query, {
      populate: 'linked_projects linked_tasks',
      sort: { createdAt: -1 }
    });
  }

  /**
   * Get personal goals
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getPersonalGoals(userId) {
    return await this.getUserGoals(userId, { is_personal: true });
  }

  /**
   * Update goal progress
   * @param {string} goalId
   * @param {number} newValue
   * @returns {Promise<Object>}
   */
  async updateProgress(goalId, newValue) {
    const goal = await this.findById(goalId);

    if (!goal) {
      throw new Error('Goal not found');
    }

    if (goal.type !== 'numeric') {
      throw new Error('Progress updates only allowed for numeric goals');
    }

    goal.current_value = newValue;
    goal.updateProgressAndStatus();

    await goal.save();

    return goal;
  }

  /**
   * Increment goal progress
   * @param {string} goalId
   * @param {number} increment
   * @returns {Promise<Object>}
   */
  async incrementProgress(goalId, increment = 1) {
    const goal = await this.findById(goalId);

    if (!goal) {
      throw new Error('Goal not found');
    }

    const newValue = goal.current_value + increment;
    return await this.updateProgress(goalId, newValue);
  }

  /**
   * Complete a step in steps goal
   * @param {string} goalId
   * @param {string} stepId
   * @returns {Promise<Object>}
   */
  async completeStep(goalId, stepId) {
    const goal = await this.findById(goalId);

    if (!goal) {
      throw new Error('Goal not found');
    }

    if (goal.type !== 'steps') {
      throw new Error('Step completion only allowed for steps goals');
    }

    const step = goal.steps.id(stepId);

    if (!step) {
      throw new Error('Step not found');
    }

    step.completed = true;
    step.completedAt = new Date();

    goal.updateProgressAndStatus();
    await goal.save();

    return goal;
  }

  /**
   * Link project to goal
   * @param {string} goalId
   * @param {string} projectId
   * @returns {Promise<Object>}
   */
  async linkProject(goalId, projectId) {
    const goal = await this.findById(goalId);

    if (!goal) {
      throw new Error('Goal not found');
    }

    if (!goal.linked_projects.includes(projectId)) {
      goal.linked_projects.push(projectId);
      await goal.save();
    }

    return goal;
  }

  /**
   * Get goal stats for user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getStats(userId) {
    const goals = await GoalBase.find({ user: userId });

    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const onTrack = goals.filter(g => g.status === 'on-track').length;
    const atRisk = goals.filter(g => g.status === 'at-risk').length;
    const behind = goals.filter(g => g.status === 'behind').length;

    const avgProgress = goals.reduce((sum, g) => sum + g.progress_percent, 0) / (total || 1);

    return {
      total,
      completed,
      onTrack,
      atRisk,
      behind,
      avgProgress: Math.round(avgProgress)
    };
  }
}

module.exports = GoalService;
```

**Step 4: Run test to verify it passes**

```bash
npm test tests/unit/services/goal.service.test.js
```

Expected: PASS

**Step 5: Create goal hierarchy service**

Create `src/services/goalHierarchy.service.js`:

```javascript
const GoalBase = require('../models/GoalBase.model');
const GoalHierarchy = require('../models/GoalHierarchy.model');
const { getWeekNumber, getWeekDates, getDayOfYear } = require('../utils/date');
const mongoose = require('mongoose');

class GoalHierarchyService {
  /**
   * Create hierarchical goal structure (Annual → Quarterly → Monthly → Weekly → Daily)
   * Uses MongoDB transactions for atomicity
   * @param {string} userId
   * @param {Object} annualGoalData
   * @returns {Promise<Object>} Created annual goal
   */
  async createHierarchicalGoal(userId, annualGoalData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create annual goal
      const annualGoal = await GoalBase.create([{
        ...annualGoalData,
        user: userId,
        level: 'annual'
      }], { session });

      const annualGoalId = annualGoal[0]._id;
      const year = annualGoalData.year || new Date().getFullYear();

      // Create hierarchy record for annual
      await GoalHierarchy.create([{
        goal: annualGoalId,
        user: userId,
        level: 'annual',
        year,
        display_in_hierarchy: true,
        display_in_checklist: false
      }], { session });

      // Create quarterly breakdown
      const quarterlyGoals = await this._createQuarterlyGoals(
        userId, annualGoal[0], year, session
      );

      // Create monthly breakdown
      const monthlyGoals = await this._createMonthlyGoals(
        userId, annualGoal[0], quarterlyGoals, year, session
      );

      // Create weekly breakdown
      const weeklyGoals = await this._createWeeklyGoals(
        userId, annualGoal[0], monthlyGoals, year, session
      );

      // Create daily breakdown (lazy - only create for current month)
      await this._createDailyGoalsForMonth(
        userId, annualGoal[0], new Date().getMonth() + 1, year, session
      );

      // Update annual goal with children
      annualGoal[0].children_goal_ids = quarterlyGoals.map(q => q._id);
      await annualGoal[0].save({ session });

      await session.commitTransaction();

      return annualGoal[0];
    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Hierarchy creation failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * Create quarterly goals
   * @private
   */
  async _createQuarterlyGoals(userId, annualGoal, year, session) {
    const quarterlyGoals = [];
    const targetPerQuarter = Math.ceil(annualGoal.target_value / 4);

    for (let quarter = 1; quarter <= 4; quarter++) {
      const goal = await GoalBase.create([{
        title: `${annualGoal.title} - Q${quarter}`,
        type: annualGoal.type,
        category: annualGoal.category,
        target_value: targetPerQuarter,
        unit: annualGoal.unit,
        user: userId
      }], { session });

      await GoalHierarchy.create([{
        goal: goal[0]._id,
        user: userId,
        level: 'quarterly',
        year,
        quarter,
        parent_goal_id: annualGoal._id,
        parent_annual_id: annualGoal._id,
        display_in_hierarchy: true
      }], { session });

      quarterlyGoals.push(goal[0]);
    }

    return quarterlyGoals;
  }

  /**
   * Create monthly goals
   * @private
   */
  async _createMonthlyGoals(userId, annualGoal, quarterlyGoals, year, session) {
    const monthlyGoals = [];
    const targetPerMonth = Math.ceil(annualGoal.target_value / 12);

    for (let month = 1; month <= 12; month++) {
      const quarter = Math.ceil(month / 3);
      const parentQuarterly = quarterlyGoals[quarter - 1];

      const goal = await GoalBase.create([{
        title: `${annualGoal.title} - ${this._getMonthName(month)}`,
        type: annualGoal.type,
        category: annualGoal.category,
        target_value: targetPerMonth,
        unit: annualGoal.unit,
        user: userId
      }], { session });

      await GoalHierarchy.create([{
        goal: goal[0]._id,
        user: userId,
        level: 'monthly',
        year,
        month,
        quarter,
        parent_goal_id: parentQuarterly._id,
        parent_annual_id: annualGoal._id,
        display_in_hierarchy: true
      }], { session });

      monthlyGoals.push(goal[0]);
    }

    return monthlyGoals;
  }

  /**
   * Create weekly goals
   * @private
   */
  async _createWeeklyGoals(userId, annualGoal, monthlyGoals, year, session) {
    const weeklyGoals = [];
    const targetPerWeek = Math.ceil(annualGoal.target_value / 52);

    for (let week = 1; week <= 52; week++) {
      const { start } = getWeekDates(year, week);
      const month = start.getMonth() + 1;
      const parentMonthly = monthlyGoals[month - 1];

      const goal = await GoalBase.create([{
        title: `${annualGoal.title} - Semaine ${week}`,
        type: annualGoal.type,
        category: annualGoal.category,
        target_value: targetPerWeek,
        unit: annualGoal.unit,
        user: userId
      }], { session });

      await GoalHierarchy.create([{
        goal: goal[0]._id,
        user: userId,
        level: 'weekly',
        year,
        week,
        month,
        parent_goal_id: parentMonthly._id,
        parent_annual_id: annualGoal._id,
        display_in_hierarchy: true
      }], { session });

      weeklyGoals.push(goal[0]);
    }

    return weeklyGoals;
  }

  /**
   * Create daily goals for a specific month (lazy loading)
   * @private
   */
  async _createDailyGoalsForMonth(userId, annualGoal, month, year, session) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const targetPerDay = annualGoal.target_value / 365;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfYear = getDayOfYear(date);
      const week = getWeekNumber(date);

      await GoalBase.create([{
        title: `${annualGoal.title} - ${date.toLocaleDateString('fr-FR')}`,
        type: annualGoal.type,
        category: annualGoal.category,
        target_value: Math.ceil(targetPerDay),
        unit: annualGoal.unit,
        user: userId
      }], { session });

      await GoalHierarchy.create([{
        goal: (await GoalBase.findOne({ user: userId, title: { $regex: date.toLocaleDateString('fr-FR') } }).session(session))._id,
        user: userId,
        level: 'daily',
        year,
        month,
        week,
        day_of_year: dayOfYear,
        parent_annual_id: annualGoal._id,
        display_in_hierarchy: false,
        display_in_checklist: true
      }], { session });
    }
  }

  /**
   * Propagate progress from child to parent goals
   * @param {string} goalId
   */
  async propagateProgressUp(goalId) {
    const hierarchy = await GoalHierarchy.findOne({ goal: goalId })
      .populate('parent_goal_id');

    if (!hierarchy || !hierarchy.parent_goal_id) {
      return; // Top of hierarchy
    }

    // Get all siblings
    const siblings = await GoalHierarchy.find({
      parent_goal_id: hierarchy.parent_goal_id
    }).populate('goal');

    // Calculate sum of children progress
    const totalProgress = siblings.reduce((sum, sibling) => {
      return sum + (sibling.goal.current_value || 0);
    }, 0);

    // Update parent
    const parentGoal = await GoalBase.findById(hierarchy.parent_goal_id);
    parentGoal.current_value = totalProgress;
    parentGoal.updateProgressAndStatus();
    await parentGoal.save();

    // Recursively propagate up
    await this.propagateProgressUp(hierarchy.parent_goal_id);
  }

  /**
   * Get goals by hierarchy level
   * @param {string} userId
   * @param {string} level - annual, quarterly, monthly, weekly, daily
   * @param {Object} filters
   */
  async getGoalsByLevel(userId, level, filters = {}) {
    const hierarchyFilter = {
      user: userId,
      level,
      ...filters
    };

    const hierarchies = await GoalHierarchy.find(hierarchyFilter)
      .populate('goal')
      .sort({ year: -1, quarter: 1, month: 1, week: 1, day_of_year: 1 });

    return hierarchies.map(h => h.goal);
  }

  /**
   * Get month name in French
   * @private
   */
  _getMonthName(month) {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  }
}

module.exports = GoalHierarchyService;
```

**Step 6: Create goal integration service**

Create `src/services/goalIntegration.service.js`:

```javascript
const GoalIntegration = require('../models/GoalIntegration.model');
const GoalBase = require('../models/GoalBase.model');
const Commit = require('../models/Commit.model');
const GoalHierarchyService = require('./goalHierarchy.service');

class GoalIntegrationService {
  constructor() {
    this.hierarchyService = new GoalHierarchyService();
  }

  /**
   * Sync commits with goals
   * @param {string} userId
   * @param {Array} commits
   */
  async syncCommits(userId, commits) {
    // Find all goals with commits integration
    const integrations = await GoalIntegration.find({
      user: userId,
      integration_type: 'commits',
      auto_sync_enabled: true
    }).populate('goal');

    for (const integration of integrations) {
      const goal = integration.goal;

      // Count commits for this goal's time period
      const commitCount = commits.length;

      // Update goal progress
      goal.current_value += commitCount;
      goal.updateProgressAndStatus();
      await goal.save();

      // Propagate up hierarchy
      await this.hierarchyService.propagateProgressUp(goal._id);

      // Record sync
      integration.recordSync(commitCount, 'success');
      await integration.save();
    }
  }

  /**
   * Sync book progress with goals
   * @param {string} userId
   * @param {Object} project - Book project
   */
  async syncBookProgress(userId, project) {
    if (project.type !== 'book') return;

    const integrations = await GoalIntegration.find({
      user: userId,
      integration_type: 'books',
      auto_sync_enabled: true
    }).populate('goal');

    for (const integration of integrations) {
      const goal = integration.goal;

      if (goal.type === 'steps') {
        // Find or create step for this book
        let step = goal.steps.find(s => s.title === project.name);

        if (!step) {
          goal.steps.push({ title: project.name, completed: false });
          step = goal.steps[goal.steps.length - 1];
        }

        // Mark as completed if project is completed
        if (project.status === 'completed' && !step.completed) {
          step.completed = true;
          step.completedAt = new Date();
        }

        goal.updateProgressAndStatus();
        await goal.save();

        integration.recordSync(1, 'success');
        await integration.save();
      }
    }
  }

  /**
   * Create integration for goal
   * @param {string} goalId
   * @param {string} userId
   * @param {string} integrationType
   */
  async createIntegration(goalId, userId, integrationType) {
    return await GoalIntegration.create({
      goal: goalId,
      user: userId,
      integration_type: integrationType,
      auto_sync_enabled: true
    });
  }

  /**
   * Get integration for goal
   * @param {string} goalId
   */
  async getIntegration(goalId) {
    return await GoalIntegration.findOne({ goal: goalId });
  }
}

module.exports = GoalIntegrationService;
```

**Step 7: Commit**

```bash
git add src/services/goal.service.js src/services/goalHierarchy.service.js src/services/goalIntegration.service.js tests/unit/services/
git commit -m "feat: add goal service layer with hierarchy and integration services"
```

---

## Phase 4: Complete Missing APIs

### Task 8: Implement Habits CRUD API

**Files:**
- Create: `src/services/habit.service.js`
- Create: `src/controllers/habit.controller.js`
- Create: `src/routes/habit.routes.js`
- Create: `src/validators/habit.validator.js`
- Create: `tests/integration/habit.test.js`

**Step 1: Write integration test for habits API**

Create `tests/integration/habit.test.js`:

```javascript
const request = require('supertest');
const app = require('../../src/server');
const { createTestUser } = require('../helpers/testDb');
const { generateAuthToken } = require('../helpers/fixtures');
const Habit = require('../../src/models/Habit.model');

describe('Habits API', () => {
  let token;
  let user;

  beforeEach(async () => {
    user = await createTestUser();
    token = generateAuthToken(user._id);
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const habitData = {
        title: 'Cours d\'anglais',
        icon: '📖',
        goal: '2x par semaine',
        goalType: 'weekly'
      };

      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send(habitData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(habitData.title);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({ icon: '📖' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/habits', () => {
    it('should get all user habits', async () => {
      await Habit.create([
        { title: 'Habit 1', user: user._id, goal: 'daily', goalType: 'daily' },
        { title: 'Habit 2', user: user._id, goal: 'weekly', goalType: 'weekly' }
      ]);

      const res = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('POST /api/habits/:id/complete', () => {
    it('should mark habit as completed for today', async () => {
      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .post(`/api/habits/${habit._id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Did it!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calendar.length).toBe(1);
      expect(res.body.data.calendar[0].status).toBe('done');
    });
  });

  describe('GET /api/habits/:id/stats', () => {
    it('should return habit statistics', async () => {
      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily',
        calendar: [
          { date: new Date(), status: 'done' },
          { date: new Date(Date.now() - 86400000), status: 'done' },
          { date: new Date(Date.now() - 172800000), status: 'skip' }
        ]
      });

      const res = await request(app)
        .get(`/api/habits/${habit._id}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCompleted).toBe(2);
      expect(res.body.data.currentStreak).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/habit.test.js
```

Expected: FAIL - "Cannot GET /api/habits"

**Step 3: Create habit service**

Create `src/services/habit.service.js`:

```javascript
const BaseService = require('./BaseService');
const Habit = require('../models/Habit.model');

class HabitService extends BaseService {
  constructor() {
    super(Habit);
  }

  /**
   * Create habit for user
   */
  async createHabit(userId, habitData) {
    return await this.create({
      ...habitData,
      user: userId
    });
  }

  /**
   * Get all habits for user
   */
  async getUserHabits(userId) {
    return await this.findAll(
      { user: userId },
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Mark habit as completed for today
   */
  async completeToday(habitId, notes = '') {
    const habit = await this.findById(habitId);

    if (!habit) {
      throw new Error('Habit not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already completed today
    const existingEntry = habit.calendar.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });

    if (existingEntry) {
      existingEntry.status = 'done';
      existingEntry.notes = notes;
    } else {
      habit.calendar.push({
        date: today,
        status: 'done',
        notes
      });
    }

    // Recalculate streak
    habit.streak = this._calculateStreak(habit.calendar);

    if (habit.streak.current > habit.streak.record) {
      habit.streak.record = habit.streak.current;
    }

    await habit.save();
    return habit;
  }

  /**
   * Mark habit as skipped for today
   */
  async skipToday(habitId) {
    const habit = await this.findById(habitId);

    if (!habit) {
      throw new Error('Habit not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    habit.calendar.push({
      date: today,
      status: 'skip'
    });

    // Recalculate streak (skip breaks streak)
    habit.streak = this._calculateStreak(habit.calendar);

    await habit.save();
    return habit;
  }

  /**
   * Get habit statistics
   */
  async getStats(habitId) {
    const habit = await this.findById(habitId);

    if (!habit) {
      throw new Error('Habit not found');
    }

    const completed = habit.calendar.filter(e => e.status === 'done');
    const total = habit.calendar.length;
    const completionRate = total > 0 ? (completed.length / total) * 100 : 0;

    const lastCompleted = completed.length > 0
      ? completed[completed.length - 1].date
      : null;

    return {
      totalCompleted: completed.length,
      totalSkipped: habit.calendar.filter(e => e.status === 'skip').length,
      completionRate: Math.round(completionRate),
      currentStreak: habit.streak.current,
      recordStreak: habit.streak.record,
      lastCompleted
    };
  }

  /**
   * Calculate current streak
   * @private
   */
  _calculateStreak(calendar) {
    if (calendar.length === 0) {
      return { current: 0, record: 0 };
    }

    // Sort by date descending
    const sorted = calendar
      .filter(e => e.status === 'done')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let current = 0;
    let record = 0;
    let temp = 0;
    let lastDate = null;

    for (const entry of sorted) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        temp = 1;
        lastDate = entryDate;
      } else {
        const diff = (lastDate - entryDate) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          temp++;
        } else {
          if (temp > record) record = temp;
          temp = 1;
        }

        lastDate = entryDate;
      }
    }

    current = temp;
    if (temp > record) record = temp;

    return { current, record };
  }
}

module.exports = HabitService;
```

**Step 4: Create habit controller**

Create `src/controllers/habit.controller.js`:

```javascript
const HabitService = require('../services/habit.service');
const habitService = new HabitService();

/**
 * @desc    Get all habits for user
 * @route   GET /api/habits
 * @access  Private
 */
exports.getHabits = async (req, res, next) => {
  try {
    const habits = await habitService.getUserHabits(req.user.id);

    res.status(200).json({
      success: true,
      count: habits.length,
      data: habits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single habit
 * @route   GET /api/habits/:id
 * @access  Private
 */
exports.getHabit = async (req, res, next) => {
  try {
    const habit = await habitService.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
    }

    // Check ownership
    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this habit'
      });
    }

    res.status(200).json({
      success: true,
      data: habit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new habit
 * @route   POST /api/habits
 * @access  Private
 */
exports.createHabit = async (req, res, next) => {
  try {
    const habit = await habitService.createHabit(req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: habit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update habit
 * @route   PUT /api/habits/:id
 * @access  Private
 */
exports.updateHabit = async (req, res, next) => {
  try {
    let habit = await habitService.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
    }

    // Check ownership
    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this habit'
      });
    }

    habit = await habitService.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: habit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete habit
 * @route   DELETE /api/habits/:id
 * @access  Private
 */
exports.deleteHabit = async (req, res, next) => {
  try {
    const habit = await habitService.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
    }

    // Check ownership
    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this habit'
      });
    }

    await habitService.delete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark habit as completed for today
 * @route   POST /api/habits/:id/complete
 * @access  Private
 */
exports.completeHabit = async (req, res, next) => {
  try {
    const habit = await habitService.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
    }

    // Check ownership
    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const updated = await habitService.completeToday(
      req.params.id,
      req.body.notes || ''
    );

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark habit as skipped for today
 * @route   POST /api/habits/:id/skip
 * @access  Private
 */
exports.skipHabit = async (req, res, next) => {
  try {
    const habit = await habitService.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
    }

    // Check ownership
    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const updated = await habitService.skipToday(req.params.id);

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get habit statistics
 * @route   GET /api/habits/:id/stats
 * @access  Private
 */
exports.getHabitStats = async (req, res, next) => {
  try {
    const habit = await habitService.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found'
      });
    }

    // Check ownership
    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const stats = await habitService.getStats(req.params.id);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
```

**Step 5: Create habit validator**

Create `src/validators/habit.validator.js`:

```javascript
const { check, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const createHabitValidator = [
  check('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),

  check('icon')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Icon must not exceed 10 characters'),

  check('goal')
    .notEmpty().withMessage('Goal is required')
    .trim(),

  check('goalType')
    .notEmpty().withMessage('Goal type is required')
    .isIn(['daily', 'weekly', 'monthly']).withMessage('Goal type must be daily, weekly, or monthly'),

  handleValidationErrors
];

const updateHabitValidator = [
  param('id')
    .isMongoId().withMessage('Invalid habit ID'),

  check('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),

  check('icon')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Icon must not exceed 10 characters'),

  handleValidationErrors
];

const habitIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid habit ID'),

  handleValidationErrors
];

const completeHabitValidator = [
  param('id')
    .isMongoId().withMessage('Invalid habit ID'),

  check('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),

  handleValidationErrors
];

module.exports = {
  createHabitValidator,
  updateHabitValidator,
  habitIdValidator,
  completeHabitValidator
};
```

**Step 6: Create habit routes**

Create `src/routes/habit.routes.js`:

```javascript
const express = require('express');
const {
  getHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabit,
  skipHabit,
  getHabitStats
} = require('../controllers/habit.controller');

const {
  createHabitValidator,
  updateHabitValidator,
  habitIdValidator,
  completeHabitValidator
} = require('../validators/habit.validator');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getHabits)
  .post(createHabitValidator, createHabit);

router.route('/:id')
  .get(habitIdValidator, getHabit)
  .put(updateHabitValidator, updateHabit)
  .delete(habitIdValidator, deleteHabit);

router.post('/:id/complete', completeHabitValidator, completeHabit);
router.post('/:id/skip', habitIdValidator, skipHabit);
router.get('/:id/stats', habitIdValidator, getHabitStats);

module.exports = router;
```

**Step 7: Register habit routes in server.js**

Edit `src/server.js` and add:

```javascript
const habitRoutes = require('./routes/habit.routes');

// Mount routes
app.use('/api/habits', habitRoutes);
```

**Step 8: Run tests to verify they pass**

```bash
npm test tests/integration/habit.test.js
```

Expected: PASS

**Step 9: Commit**

```bash
git add src/services/habit.service.js src/controllers/habit.controller.js src/routes/habit.routes.js src/validators/habit.validator.js tests/integration/habit.test.js src/server.js
git commit -m "feat: implement complete Habits CRUD API with service layer"
```

---

**PLAN CONTINUES...**

This is Phase 1-4 of the complete reboot plan. The remaining phases would cover:

- **Phase 5**: Pomodoro API
- **Phase 6**: Badge/Gamification System
- **Phase 7**: Weekly Review Auto-generation
- **Phase 8**: Activity Feed API
- **Phase 9**: Reminders/Notifications System
- **Phase 10**: Refactor Existing Controllers (Dashboard, Task, Project, Goal)
- **Phase 11**: Background Jobs with Bull
- **Phase 12**: API Documentation with Swagger
- **Phase 13**: Frontend Route Protection & Fixes
- **Phase 14**: Frontend Gamification UI
- **Phase 15**: Deployment & CI/CD

---

## Estimated Timeline

- **Phase 1-4 (Foundation)**: 2 weeks
- **Phase 5-9 (Missing APIs)**: 2 weeks
- **Phase 10-12 (Refactoring & Polish)**: 2 weeks
- **Phase 13-15 (Frontend & Deployment)**: 1 week

**Total**: ~7 weeks for complete professional reboot

---

