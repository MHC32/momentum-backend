const GoalIntegration = require('../models/GoalIntegration.model');
const GoalBase = require('../models/GoalBase.model');
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
      goal.calculateProgress();
      goal.calculateStatus();
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

        goal.calculateProgress();
        goal.calculateStatus();
        await goal.save();

        integration.recordSync(1, 'success');
        await integration.save();
      }
    }
  }

  /**
   * Sync Rise savings data with goals
   * @param {string} userId
   * @param {number} currentSavings - Current savings amount
   */
  async syncRiseSavings(userId, currentSavings) {
    const integrations = await GoalIntegration.find({
      user: userId,
      integration_type: 'rise_savings',
      auto_sync_enabled: true
    }).populate('goal');

    for (const integration of integrations) {
      const goal = integration.goal;

      goal.current_value = currentSavings;
      goal.calculateProgress();
      goal.calculateStatus();
      await goal.save();

      // Propagate up hierarchy
      await this.hierarchyService.propagateProgressUp(goal._id);

      integration.recordSync(1, 'success');
      await integration.save();
    }
  }

  /**
   * Sync Rise expenses data with goals
   * @param {string} userId
   * @param {number} totalExpenses - Total expenses amount
   */
  async syncRiseExpenses(userId, totalExpenses) {
    const integrations = await GoalIntegration.find({
      user: userId,
      integration_type: 'rise_expenses',
      auto_sync_enabled: true
    }).populate('goal');

    for (const integration of integrations) {
      const goal = integration.goal;

      // For expense goals, lower is better - track budget remaining
      const target = goal.target_value;
      goal.current_value = Math.max(0, target - totalExpenses);
      goal.calculateProgress();
      goal.calculateStatus();
      await goal.save();

      integration.recordSync(1, 'success');
      await integration.save();
    }
  }

  /**
   * Create integration for goal
   * @param {string} goalId
   * @param {string} userId
   * @param {string} integrationType
   * @param {Object} config - Optional integration config
   */
  async createIntegration(goalId, userId, integrationType, config = {}) {
    return await GoalIntegration.create({
      goal: goalId,
      user: userId,
      integration_type: integrationType,
      auto_sync_enabled: true,
      config
    });
  }

  /**
   * Get integration for goal
   * @param {string} goalId
   */
  async getIntegration(goalId) {
    return await GoalIntegration.findOne({ goal: goalId });
  }

  /**
   * Update integration settings
   * @param {string} goalId
   * @param {Object} updates
   */
  async updateIntegration(goalId, updates) {
    return await GoalIntegration.findOneAndUpdate(
      { goal: goalId },
      updates,
      { new: true }
    );
  }

  /**
   * Enable/disable auto-sync
   * @param {string} goalId
   * @param {boolean} enabled
   */
  async setAutoSync(goalId, enabled) {
    return await this.updateIntegration(goalId, { auto_sync_enabled: enabled });
  }

  /**
   * Get all integrations for user
   * @param {string} userId
   * @param {string} integrationType - Optional filter by type
   */
  async getUserIntegrations(userId, integrationType = null) {
    const filter = { user: userId };
    if (integrationType) {
      filter.integration_type = integrationType;
    }

    return await GoalIntegration.find(filter).populate('goal');
  }

  /**
   * Delete integration
   * @param {string} goalId
   */
  async deleteIntegration(goalId) {
    return await GoalIntegration.findOneAndDelete({ goal: goalId });
  }
}

module.exports = GoalIntegrationService;
