const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['urgent', 'suggestion', 'planning'],
    required: true,
    index: true
  },
  
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  title: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  actionUrl: String,
  
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  relatedGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  relatedHabit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit'
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  isDismissed: {
    type: Boolean,
    default: false
  },
  
  readAt: Date,
  dismissedAt: Date
}, {
  timestamps: true
});

// Index
ReminderSchema.index({ user: 1, isRead: 1, isDismissed: 1 });
ReminderSchema.index({ user: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Reminder', ReminderSchema);