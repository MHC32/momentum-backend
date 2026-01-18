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

/**
 * Calculate progress percentage based on goal type
 * @returns {number} Progress percentage (0-100)
 */
goalBaseSchema.methods.calculateProgress = function() {
  let progress = 0;

  if (this.type === 'numeric' && this.target_value > 0) {
    progress = (this.current_value / this.target_value) * 100;
  } else if (this.type === 'steps' && this.total_steps > 0) {
    const completedSteps = this.steps.filter(s => s.completed).length;
    progress = (completedSteps / this.total_steps) * 100;
  } else if (this.type === 'simple') {
    // Simple goals are either 0% or 100%
    progress = this.status === 'completed' ? 100 : 0;
  }

  // Round to 2 decimal places and cap at 100
  const roundedProgress = Math.round(progress * 100) / 100;
  this.progress_percent = Math.min(roundedProgress, 100);

  return this.progress_percent;
};

/**
 * Calculate status based on current progress
 * @returns {string} Status value
 */
goalBaseSchema.methods.calculateStatus = function() {
  const progress = this.calculateProgress();

  if (progress >= 100) {
    this.status = 'completed';
  } else if (progress >= 75) {
    this.status = 'on-track';
  } else if (progress >= 50) {
    this.status = 'at-risk';
  } else {
    this.status = 'behind';
  }

  return this.status;
};

/**
 * Update progress percentage and status together
 */
goalBaseSchema.methods.updateProgressAndStatus = async function() {
  this.calculateProgress();
  this.calculateStatus();

  if (this.progress_percent >= 100 && !this.completedAt) {
    this.completedAt = new Date();
  }

  return this.save();
};

// Pre-save hook to calculate progress and status
goalBaseSchema.pre('save', function() {
  this.calculateProgress();

  // Only recalculate status if not already completed
  if (this.status !== 'completed' || this.progress_percent >= 100) {
    this.calculateStatus();
  }

  if (this.progress_percent >= 100 && !this.completedAt) {
    this.completedAt = new Date();
  }
});

module.exports = mongoose.model('GoalBase', goalBaseSchema);
