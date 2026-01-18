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

    it('should throw error for non-numeric goal', async () => {
      const goal = await GoalBase.create({
        title: 'Steps Goal',
        type: 'steps',
        category: 'learning',
        total_steps: 5,
        user: user._id
      });

      await expect(goalService.updateProgress(goal._id, 50))
        .rejects
        .toThrow('Progress updates only allowed for numeric goals');
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

    it('should throw error for non-steps goal', async () => {
      const goal = await GoalBase.create({
        title: 'Numeric Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        user: user._id
      });

      await expect(goalService.completeStep(goal._id, 'fake-step-id'))
        .rejects
        .toThrow('Step completion only allowed for steps goals');
    });
  });

  describe('getUserGoals', () => {
    it('should return all goals for user', async () => {
      await GoalBase.create({
        title: 'Goal 1',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        user: user._id
      });

      await GoalBase.create({
        title: 'Goal 2',
        type: 'simple',
        category: 'personal',
        user: user._id
      });

      const goals = await goalService.getUserGoals(user._id);

      expect(goals.length).toBe(2);
    });
  });

  describe('getPersonalGoals', () => {
    it('should return only personal goals', async () => {
      await GoalBase.create({
        title: 'Personal Goal',
        type: 'numeric',
        category: 'personal',
        target_value: 100,
        is_personal: true,
        user: user._id
      });

      await GoalBase.create({
        title: 'Regular Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        is_personal: false,
        user: user._id
      });

      const goals = await goalService.getPersonalGoals(user._id);

      expect(goals.length).toBe(1);
      expect(goals[0].is_personal).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return goal statistics', async () => {
      await GoalBase.create({
        title: 'Completed Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        current_value: 100,
        user: user._id
      });

      await GoalBase.create({
        title: 'In Progress Goal',
        type: 'numeric',
        category: 'learning',
        target_value: 100,
        current_value: 80,
        user: user._id
      });

      await GoalBase.create({
        title: 'Behind Goal',
        type: 'numeric',
        category: 'health',
        target_value: 100,
        current_value: 20,
        user: user._id
      });

      const stats = await goalService.getStats(user._id);

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.onTrack).toBe(1);
      expect(stats.behind).toBe(1);
    });
  });

  describe('linkProject', () => {
    it('should link a project to goal', async () => {
      const goal = await GoalBase.create({
        title: 'Test Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        user: user._id
      });

      const projectId = '507f1f77bcf86cd799439011';
      const updated = await goalService.linkProject(goal._id, projectId);

      expect(updated.linked_projects).toContainEqual(
        expect.objectContaining({ toString: expect.any(Function) })
      );
    });

    it('should not duplicate project link', async () => {
      const goal = await GoalBase.create({
        title: 'Test Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        user: user._id
      });

      const projectId = '507f1f77bcf86cd799439011';
      await goalService.linkProject(goal._id, projectId);
      const updated = await goalService.linkProject(goal._id, projectId);

      expect(updated.linked_projects.length).toBe(1);
    });
  });

  describe('incrementProgress', () => {
    it('should increment goal progress by specified amount', async () => {
      const goal = await GoalBase.create({
        title: 'Test Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        current_value: 10,
        user: user._id
      });

      const updated = await goalService.incrementProgress(goal._id, 5);

      expect(updated.current_value).toBe(15);
    });

    it('should increment by 1 by default', async () => {
      const goal = await GoalBase.create({
        title: 'Test Goal',
        type: 'numeric',
        category: 'professional',
        target_value: 100,
        current_value: 10,
        user: user._id
      });

      const updated = await goalService.incrementProgress(goal._id);

      expect(updated.current_value).toBe(11);
    });
  });
});
