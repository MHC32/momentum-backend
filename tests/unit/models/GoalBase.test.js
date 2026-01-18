const mongoose = require('mongoose');
const { createTestUser } = require('../../helpers/testDb');

describe('GoalBase Model', () => {
  let userId;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user._id;
  });

  describe('Create numeric goal', () => {
    test('should create a numeric goal with target and current values', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goalData = {
        user: userId,
        title: '100 Commits This Year',
        description: 'Complete 100 commits in 2026',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        current_value: 25,
        unit: 'commits',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      };

      const goal = await GoalBase.create(goalData);

      expect(goal).toBeDefined();
      expect(goal._id).toBeDefined();
      expect(goal.title).toBe('100 Commits This Year');
      expect(goal.type).toBe('numeric');
      expect(goal.category).toBe('professional');
      expect(goal.target_value).toBe(100);
      expect(goal.current_value).toBe(25);
      expect(goal.unit).toBe('commits');
      expect(goal.user.toString()).toBe(userId.toString());
    });
  });

  describe('Calculate progress correctly', () => {
    test('should calculate progress for numeric goal', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Read 12 Books',
        type: 'numeric',
        category: 'learning',
        target_value: 12,
        current_value: 8,
        unit: 'books'
      });

      const progress = goal.calculateProgress();

      // 8/12 * 100 = 66.67%
      expect(progress).toBeCloseTo(66.67, 1);
      expect(goal.progress_percent).toBeCloseTo(66.67, 1);
    });

    test('should cap progress at 100% for numeric goal', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Earn $10,000',
        type: 'numeric',
        category: 'financial',
        target_value: 10000,
        current_value: 12000,
        unit: '$'
      });

      const progress = goal.calculateProgress();

      expect(progress).toBe(100);
    });

    test('should return 0 for simple goal when not completed', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Launch Website',
        type: 'simple',
        category: 'professional'
      });

      const progress = goal.calculateProgress();

      expect(progress).toBe(0);
    });
  });

  describe('Create steps goal', () => {
    test('should create a goal with steps', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goalData = {
        user: userId,
        title: 'Complete Course',
        type: 'steps',
        category: 'learning',
        total_steps: 4,
        steps: [
          { title: 'Module 1', completed: true, completedAt: new Date() },
          { title: 'Module 2', completed: true, completedAt: new Date() },
          { title: 'Module 3', completed: false },
          { title: 'Module 4', completed: false }
        ]
      };

      const goal = await GoalBase.create(goalData);

      expect(goal).toBeDefined();
      expect(goal.type).toBe('steps');
      expect(goal.total_steps).toBe(4);
      expect(goal.steps.length).toBe(4);
      expect(goal.steps[0].completed).toBe(true);
      expect(goal.steps[2].completed).toBe(false);
    });

    test('should calculate progress for steps goal', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Project Milestones',
        type: 'steps',
        category: 'professional',
        total_steps: 5,
        steps: [
          { title: 'Planning', completed: true },
          { title: 'Design', completed: true },
          { title: 'Development', completed: true },
          { title: 'Testing', completed: false },
          { title: 'Deployment', completed: false }
        ]
      });

      const progress = goal.calculateProgress();

      // 3/5 * 100 = 60%
      expect(progress).toBe(60);
    });
  });

  describe('Calculate status based on progress', () => {
    test('should return completed status when progress is 100%', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Complete Goal',
        type: 'numeric',
        category: 'personal',
        target_value: 100,
        current_value: 100,
        unit: 'points'
      });

      const status = goal.calculateStatus();

      expect(status).toBe('completed');
      expect(goal.status).toBe('completed');
    });

    test('should return on-track status when progress is 75-99%', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Almost There',
        type: 'numeric',
        category: 'health',
        target_value: 100,
        current_value: 80,
        unit: 'km'
      });

      const status = goal.calculateStatus();

      expect(status).toBe('on-track');
    });

    test('should return at-risk status when progress is 50-74%', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Halfway Goal',
        type: 'numeric',
        category: 'learning',
        target_value: 100,
        current_value: 60,
        unit: 'hours'
      });

      const status = goal.calculateStatus();

      expect(status).toBe('at-risk');
    });

    test('should return behind status when progress is < 50%', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Behind Schedule',
        type: 'numeric',
        category: 'financial',
        target_value: 100,
        current_value: 30,
        unit: '$'
      });

      const status = goal.calculateStatus();

      expect(status).toBe('behind');
    });
  });

  describe('Update progress and status', () => {
    test('should update progress and status when calling updateProgressAndStatus', async () => {
      const GoalBase = require('../../../src/models/GoalBase.model');

      const goal = await GoalBase.create({
        user: userId,
        title: 'Dynamic Update',
        type: 'numeric',
        category: 'health',
        target_value: 100,
        current_value: 0,
        unit: 'workouts'
      });

      expect(goal.progress_percent).toBe(0);

      goal.current_value = 75;
      await goal.updateProgressAndStatus();

      expect(goal.progress_percent).toBe(75);
      expect(goal.status).toBe('on-track');
    });
  });
});
