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
    goal.calculateProgress();
    goal.calculateStatus();

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

    goal.calculateProgress();
    goal.calculateStatus();
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
   * Link task to goal
   * @param {string} goalId
   * @param {string} taskId
   * @returns {Promise<Object>}
   */
  async linkTask(goalId, taskId) {
    const goal = await this.findById(goalId);

    if (!goal) {
      throw new Error('Goal not found');
    }

    if (!goal.linked_tasks.includes(taskId)) {
      goal.linked_tasks.push(taskId);
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

  /**
   * Get goals by category
   * @param {string} userId
   * @param {string} category
   * @returns {Promise<Array>}
   */
  async getByCategory(userId, category) {
    return await this.getUserGoals(userId, { category });
  }

  /**
   * Get goals by type
   * @param {string} userId
   * @param {string} type
   * @returns {Promise<Array>}
   */
  async getByType(userId, type) {
    return await this.getUserGoals(userId, { type });
  }
}

module.exports = GoalService;
