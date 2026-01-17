const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  slug: {
    type: String,
    required: true,
    enum: [
      'first-task', 'first-commit', 'first-goal', 
      'task-master-10', 'task-master-50', 'task-master-100',
      'commit-streak-7', 'commit-streak-30', 'commit-streak-100',
      'goal-crusher', 'century-commits', 'pomodoro-master',
      'early-bird', 'night-owl', 'weekend-warrior',
      'project-starter', 'project-finisher', 'multitasker',
      'focused-mind', 'habit-builder', 'review-master',
      'speed-demon', 'perfectionist', 'explorer'
    ]
  },
  
  title: {
    type: String,
    required: true
  },
  
  description: String,
  
  icon: String,
  
  category: {
    type: String,
    enum: ['tasks', 'commits', 'goals', 'habits', 'time', 'special'],
    default: 'special'
  },
  
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  
  xpReward: {
    type: Number,
    default: 0
  },
  
  unlockedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index unique par badge
BadgeSchema.index({ user: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Badge', BadgeSchema);