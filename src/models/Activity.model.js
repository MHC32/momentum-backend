const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  type: {
    type: String,
    enum: [
      'commit', 'task-completed', 'goal-achieved', 
      'pomodoro-completed', 'habit-completed', 'badge-unlocked',
      'project-created', 'commits-grouped'
    ],
    required: true,
    index: true
  },
  
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Références optionnelles
  commit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commit'
  },
  
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  
  pomodoro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pomodoro'
  },
  
  habit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit'
  },
  
  badge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge'
  },
  
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Métadonnées
  metadata: {
    title: String,
    description: String,
    projectName: String,
    icon: String,
    count: Number,
    stats: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index composés pour timeline
ActivitySchema.index({ user: 1, timestamp: -1 });
ActivitySchema.index({ user: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);