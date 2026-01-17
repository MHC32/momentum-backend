const mongoose = require('mongoose');

const WeeklyReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 53
  },
  
  year: {
    type: Number,
    required: true
  },
  
  weekStart: {
    type: Date,
    required: true
  },
  
  weekEnd: {
    type: Date,
    required: true
  },
  
  stats: {
    tasksCompleted: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    commits: { type: Number, default: 0 },
    pomodoroSessions: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 }
  },
  
  achievements: [{
    type: String
  }],
  
  timeByProject: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    minutes: Number
  }],
  
  notes: String,
  
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  completedAt: Date,
  
  exportUrl: String
}, {
  timestamps: true
});

// Index unique par semaine
WeeklyReviewSchema.index({ user: 1, year: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyReview', WeeklyReviewSchema);