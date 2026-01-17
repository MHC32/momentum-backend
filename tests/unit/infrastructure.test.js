const mongoose = require('mongoose');
const { createTestUser, createTestProject, createTestTask, createTestGoal } = require('../helpers/testDb');
const { generateAuthToken, validTaskPayload, validProjectPayload, validGoalPayload } = require('../helpers/fixtures');

describe('Testing Infrastructure', () => {
  describe('Database Connection', () => {
    test('should connect to MongoDB Memory Server', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });

    test('should have access to collections', async () => {
      const collections = await mongoose.connection.db.listCollections().toArray();
      expect(collections).toBeDefined();
      expect(Array.isArray(collections)).toBe(true);
    });
  });

  describe('Test Helpers', () => {
    describe('createTestUser', () => {
      test('should create a user with default values', async () => {
        const user = await createTestUser();

        expect(user).toBeDefined();
        expect(user._id).toBeDefined();
        expect(user.name).toBe('Test User');
        expect(user.email).toBe('test@example.com');
        expect(user.role).toBe('user');
        expect(user.xp).toBe(0);
        expect(user.level).toBe(1);
      });

      test('should create a user with custom values', async () => {
        const user = await createTestUser({
          name: 'Custom User',
          email: 'custom@example.com',
          xp: 500,
          level: 5
        });

        expect(user.name).toBe('Custom User');
        expect(user.email).toBe('custom@example.com');
        expect(user.xp).toBe(500);
        expect(user.level).toBe(5);
      });

      test('should hash password before saving', async () => {
        const user = await createTestUser({ password: 'plainPassword123' });
        const userWithPassword = await mongoose.model('User').findById(user._id).select('+password');

        expect(userWithPassword.password).toBeDefined();
        expect(userWithPassword.password).not.toBe('plainPassword123');
      });
    });

    describe('createTestProject', () => {
      test('should create a project for a user', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user._id);

        expect(project).toBeDefined();
        expect(project._id).toBeDefined();
        expect(project.name).toBe('Test Project');
        expect(project.type).toBe('dev');
        expect(project.user.toString()).toBe(user._id.toString());
      });

      test('should create a project with custom values', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user._id, {
          name: 'Custom Project',
          type: 'book',
          priority: 'high'
        });

        expect(project.name).toBe('Custom Project');
        expect(project.type).toBe('book');
        expect(project.priority).toBe('high');
      });
    });

    describe('createTestTask', () => {
      test('should create a task for a user', async () => {
        const user = await createTestUser();
        const task = await createTestTask(user._id);

        expect(task).toBeDefined();
        expect(task._id).toBeDefined();
        expect(task.title).toBe('Test Task');
        expect(task.status).toBe('todo');
        expect(task.user.toString()).toBe(user._id.toString());
      });

      test('should create a task linked to a project', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user._id);
        const task = await createTestTask(user._id, project._id);

        expect(task.project.toString()).toBe(project._id.toString());
      });

      test('should create a task with custom values', async () => {
        const user = await createTestUser();
        const task = await createTestTask(user._id, null, {
          title: 'Custom Task',
          priority: 'critical',
          status: 'in-progress'
        });

        expect(task.title).toBe('Custom Task');
        expect(task.priority).toBe('critical');
        expect(task.status).toBe('in-progress');
      });
    });

    describe('createTestGoal', () => {
      test('should create a goal for a user', async () => {
        const user = await createTestUser();
        const goal = await createTestGoal(user._id);

        expect(goal).toBeDefined();
        expect(goal._id).toBeDefined();
        expect(goal.title).toBe('Test Goal');
        expect(goal.type).toBe('simple');
        expect(goal.user.toString()).toBe(user._id.toString());
      });

      test('should create a numeric goal with custom values', async () => {
        const user = await createTestUser();
        const goal = await createTestGoal(user._id, {
          title: 'Complete 100 commits',
          type: 'numeric',
          target_value: 100,
          current_value: 25
        });

        expect(goal.title).toBe('Complete 100 commits');
        expect(goal.type).toBe('numeric');
        expect(goal.target_value).toBe(100);
        expect(goal.current_value).toBe(25);
      });
    });
  });

  describe('Test Fixtures', () => {
    describe('generateAuthToken', () => {
      test('should generate a valid JWT token', async () => {
        const user = await createTestUser();
        const token = generateAuthToken(user._id);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      });

      test('should encode user ID in token', async () => {
        const user = await createTestUser();
        const token = generateAuthToken(user._id);
        const jwt = require('jsonwebtoken');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded.id.toString()).toBe(user._id.toString());
      });
    });

    describe('validTaskPayload', () => {
      test('should have required fields', () => {
        expect(validTaskPayload.title).toBeDefined();
        expect(validTaskPayload.type).toBeDefined();
        expect(validTaskPayload.status).toBeDefined();
      });
    });

    describe('validProjectPayload', () => {
      test('should have required fields', () => {
        expect(validProjectPayload.name).toBeDefined();
        expect(validProjectPayload.type).toBeDefined();
        expect(validProjectPayload.status).toBeDefined();
      });
    });

    describe('validGoalPayload', () => {
      test('should have required fields', () => {
        expect(validGoalPayload.title).toBeDefined();
        expect(validGoalPayload.type).toBeDefined();
        expect(validGoalPayload.category).toBeDefined();
        expect(validGoalPayload.level).toBeDefined();
      });
    });
  });

  describe('Database Cleanup', () => {
    test('should clear collections between tests', async () => {
      // Create a user
      await createTestUser({ email: 'cleanup-test@example.com' });

      // Verify user exists
      const User = mongoose.model('User');
      const usersBefore = await User.countDocuments();
      expect(usersBefore).toBeGreaterThan(0);

      // The afterEach hook in setup.js will clear collections
      // Next test will verify collections are empty
    });

    test('should have empty collections after cleanup', async () => {
      const User = mongoose.model('User');
      const users = await User.countDocuments();
      expect(users).toBe(0);
    });
  });
});
