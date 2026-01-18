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
