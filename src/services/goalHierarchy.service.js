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
        user: userId
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
      await this._createWeeklyGoals(
        userId, annualGoal[0], monthlyGoals, year, session
      );

      // Create daily breakdown (lazy - only create for current month)
      await this._createDailyGoalsForMonth(
        userId, annualGoal[0], new Date().getMonth() + 1, year, session
      );

      // Update annual goal hierarchy with children
      const hierarchy = await GoalHierarchy.findOne({ goal: annualGoalId }).session(session);
      hierarchy.children_goal_ids = quarterlyGoals.map(q => q._id);
      await hierarchy.save({ session });

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

      const goal = await GoalBase.create([{
        title: `${annualGoal.title} - ${date.toLocaleDateString('fr-FR')}`,
        type: annualGoal.type,
        category: annualGoal.category,
        target_value: Math.ceil(targetPerDay),
        unit: annualGoal.unit,
        user: userId
      }], { session });

      await GoalHierarchy.create([{
        goal: goal[0]._id,
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
    parentGoal.calculateProgress();
    parentGoal.calculateStatus();
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
   * Get annual goals
   * @param {string} userId
   * @param {number} year
   */
  async getAnnualGoals(userId, year) {
    return await this.getGoalsByLevel(userId, 'annual', { year });
  }

  /**
   * Get quarterly goals
   * @param {string} userId
   * @param {number} year
   * @param {number} quarter
   */
  async getQuarterlyGoals(userId, year, quarter = null) {
    const filters = { year };
    if (quarter) filters.quarter = quarter;
    return await this.getGoalsByLevel(userId, 'quarterly', filters);
  }

  /**
   * Get monthly goals
   * @param {string} userId
   * @param {number} year
   * @param {number} month
   */
  async getMonthlyGoals(userId, year, month = null) {
    const filters = { year };
    if (month) filters.month = month;
    return await this.getGoalsByLevel(userId, 'monthly', filters);
  }

  /**
   * Get weekly goals
   * @param {string} userId
   * @param {number} year
   * @param {number} week
   */
  async getWeeklyGoals(userId, year, week = null) {
    const filters = { year };
    if (week) filters.week = week;
    return await this.getGoalsByLevel(userId, 'weekly', filters);
  }

  /**
   * Get daily goals
   * @param {string} userId
   * @param {number} year
   * @param {number} month
   */
  async getDailyGoals(userId, year, month) {
    return await this.getGoalsByLevel(userId, 'daily', { year, month });
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
