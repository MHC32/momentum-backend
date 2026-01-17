const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    maxlength: 1000
  },
  
  icon: {
    type: String,
    default: '🎯'
  },
  
  goal: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  goalType: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  },
  
  calendar: [{
    date: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['done', 'skip', 'missed'],
      required: true
    },
    notes: {
      type: String,
      maxlength: 500
    }
  }],
  
  streak: {
    current: {
      type: Number,
      default: 0
    },
    record: {
      type: Number,
      default: 0
    }
  },
  
  stats: {
    totalCompleted: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    lastCompleted: Date
  },
  
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
HabitSchema.index({ user: 1, archived: 1 });

module.exports = mongoose.model('Habit', HabitSchema);